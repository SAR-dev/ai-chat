import { create } from 'zustand'
import type { ChatSession, ChatMessage } from '@/types'
import * as api from '@/lib/apiClient'

interface ChatState {
  sessions: ChatSession[]
  messagesBySessionId: Record<string, ChatMessage[]>
  activeSessionId: string | null
  isStreaming: boolean
  sessionsStatus: 'idle' | 'loading' | 'error'
  messagesStatus: 'idle' | 'loading' | 'error'
  streamingContent: string

  loadSessions: () => Promise<void>
  createSession: () => Promise<ChatSession>
  renameSession: (id: string, title: string) => Promise<void>
  deleteSession: (id: string) => Promise<void>
  setActiveSession: (id: string | null) => void
  loadMessages: (sessionId: string) => Promise<void>
  sendMessage: (sessionId: string, content: string) => Promise<void>
  sendMessageStreaming: (sessionId: string, content: string) => Promise<void>
  stopStreaming: () => void
  regenerateMessage: (messageId: string) => Promise<void>
  submitFeedback: (
    messageId: string,
    rating: 'helpful' | 'not_helpful',
    comment?: string,
  ) => Promise<void>
}

let abortController: AbortController | null = null

export const useChatStore = create<ChatState>()((set, get) => ({
  sessions: [],
  messagesBySessionId: {},
  activeSessionId: null,
  isStreaming: false,
  sessionsStatus: 'idle',
  messagesStatus: 'idle',
  streamingContent: '',

  loadSessions: async () => {
    set({ sessionsStatus: 'loading' })
    try {
      const sessions = await api.fetchSessions()
      set({ sessions, sessionsStatus: 'idle' })
    } catch {
      set({ sessionsStatus: 'error' })
    }
  },

  createSession: async () => {
    const session = await api.createSession()
    set((state) => ({ sessions: [session, ...state.sessions] }))
    return session
  },

  renameSession: async (id: string, title: string) => {
    const updated = await api.renameSession(id, title)
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === id ? updated : s)),
    }))
  },

  deleteSession: async (id: string) => {
    await api.deleteSessionApi(id)
    set((state) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [id]: _, ...rest } = state.messagesBySessionId
      return {
        sessions: state.sessions.filter((s) => s.id !== id),
        messagesBySessionId: rest,
        activeSessionId: state.activeSessionId === id ? null : state.activeSessionId,
      }
    })
  },

  setActiveSession: (id: string | null) => {
    set({ activeSessionId: id })
  },

  loadMessages: async (sessionId: string) => {
    set({ messagesStatus: 'loading' })
    try {
      const messages = await api.fetchMessages(sessionId)
      set((state) => ({
        messagesBySessionId: { ...state.messagesBySessionId, [sessionId]: messages },
        messagesStatus: 'idle',
      }))
    } catch {
      set({ messagesStatus: 'error' })
    }
  },

  sendMessage: async (sessionId: string, content: string) => {
    const userMessage: ChatMessage = {
      id: `local-${Date.now()}-user`,
      sessionId,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    }

    set((state) => ({
      messagesBySessionId: {
        ...state.messagesBySessionId,
        [sessionId]: [...(state.messagesBySessionId[sessionId] ?? []), userMessage],
      },
    }))

    try {
      const assistantMessage = await api.sendMessage(sessionId, { content })
      set((state) => ({
        messagesBySessionId: {
          ...state.messagesBySessionId,
          [sessionId]: [...(state.messagesBySessionId[sessionId] ?? []), assistantMessage],
        },
      }))
    } catch {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        sessionId,
        role: 'assistant',
        content: 'Failed to send message. Please try again.',
        timestamp: new Date().toISOString(),
      }
      set((state) => ({
        messagesBySessionId: {
          ...state.messagesBySessionId,
          [sessionId]: [...(state.messagesBySessionId[sessionId] ?? []), errorMessage],
        },
      }))
    }
  },

  sendMessageStreaming: async (sessionId: string, content: string) => {
    const userMessage: ChatMessage = {
      id: `local-${Date.now()}-user`,
      sessionId,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    }

    set((state) => ({
      messagesBySessionId: {
        ...state.messagesBySessionId,
        [sessionId]: [...(state.messagesBySessionId[sessionId] ?? []), userMessage],
      },
      isStreaming: true,
      streamingContent: '',
    }))

    abortController = new AbortController()

    try {
      const assistantMessage = await api.sendMessageStream(
        sessionId,
        { content },
        (chunk) => {
          set((state) => ({
            streamingContent: state.streamingContent + chunk,
          }))
        },
        abortController.signal,
      )

      set((state) => ({
        messagesBySessionId: {
          ...state.messagesBySessionId,
          [sessionId]: [...(state.messagesBySessionId[sessionId] ?? []), assistantMessage],
        },
        isStreaming: false,
        streamingContent: '',
      }))
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        const partialContent = get().streamingContent
        if (partialContent) {
          const partialMessage: ChatMessage = {
            id: `msg-${Date.now()}-partial`,
            sessionId,
            role: 'assistant',
            content: partialContent,
            timestamp: new Date().toISOString(),
          }
          set((state) => ({
            messagesBySessionId: {
              ...state.messagesBySessionId,
              [sessionId]: [...(state.messagesBySessionId[sessionId] ?? []), partialMessage],
            },
          }))
        }
      }
      set({ isStreaming: false, streamingContent: '' })
    }
  },

  stopStreaming: () => {
    if (abortController) {
      abortController.abort()
      abortController = null
    }
  },

  regenerateMessage: async (messageId: string) => {
    try {
      const newMessage = await api.regenerateMessage(messageId)
      set((state) => {
        const sessionMessages = state.messagesBySessionId[newMessage.sessionId] ?? []
        return {
          messagesBySessionId: {
            ...state.messagesBySessionId,
            [newMessage.sessionId]: [...sessionMessages, newMessage],
          },
        }
      })
    } catch {
      // ignore
    }
  },

  submitFeedback: async (
    messageId: string,
    rating: 'helpful' | 'not_helpful',
    comment?: string,
  ) => {
    try {
      await api.submitFeedback(messageId, { rating, comment })
    } catch {
      // ignore
    }
  },
}))
