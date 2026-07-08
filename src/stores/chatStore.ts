import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type {
  ChatSessionSummary,
  MessageState,
  ArtifactData,
  GeneratedImage,
  SlideDeck,
  SourceLink,
  SlideStageId,
  SlideStageStatus,
  Category,
} from '@/types'
import * as api from '@/lib/apiClient'
import { storeImages, getStoredImages } from '@/lib/imageStore'

interface ChatState {
  sessions: ChatSessionSummary[]
  messagesBySessionId: Record<string, MessageState[]>
  activeSessionId: string | null
  isStreaming: boolean
  streamingMessageId: string | null
  sessionsStatus: 'idle' | 'loading' | 'error'
  messagesStatus: 'idle' | 'loading' | 'error'
  isEndOfHistory: boolean
  categories: Category[]
  categoriesStatus: 'idle' | 'loading' | 'error'

  loadSessions: (limit?: number, offset?: number) => Promise<void>
  fetchCategories: () => Promise<void>
  loadMoreSessions: () => Promise<void>
  createSession: () => Promise<ChatSessionSummary>
  deleteSession: (id: string) => Promise<void>
  renameSession: (id: string, title: string) => Promise<void>
  setActiveSession: (id: string | null) => void
  loadMessages: (sessionId: string) => Promise<void>

  sendChatMessage: (
    sessionId: string,
    message: string,
    opts?: {
      mode?: 'fast' | 'thinking'
      internet_search?: boolean
      slide_mode?: 'standard' | 'creative'
      agent_mode?: boolean
      file?: File
    },
  ) => Promise<string>

  sendRagMessage: (
    sessionId: string,
    query: string,
    category: string,
    opts?: {
      top_k?: string
      show_context?: boolean
      mode?: 'fast' | 'thinking'
      internet_search?: boolean
      agent_mode?: boolean
    },
  ) => Promise<void>

  stopStreaming: () => void
  regenerateMessage: (sessionId: string, messageId: number) => Promise<void>
  editAndResend: (sessionId: string, fromMessageId: number, newContent: string) => Promise<void>
  submitFeedback: (messageId: number, isHelpful: boolean | null) => Promise<void>
  regenerateSlide: (deckId: string, slideId: number, instruction: string) => Promise<void>
}

let abortController: AbortController | null = null
let currentRequestId: string | null = null

function createMessageState(role: 'user' | 'assistant', content = ''): MessageState {
  return {
    type: role === 'user' ? 'right' : 'left',
    content,
    tag: '',
    cancelled: false,
    agentTools: [],
    agentReasoning: '',
    imageStatus: '',
    images: [],
    slideStatus: '',
    slideStages: {},
    slides: [],
    sources: [],
    artifacts: [],
    isRagMessage: false,
    assistantMessageId: null,
    uuid: uuidv4(),
    file: null,
    dbId: null,
  }
}

export const useChatStore = create<ChatState>()((set, get) => ({
  sessions: [],
  messagesBySessionId: {},
  activeSessionId: null,
  isStreaming: false,
  streamingMessageId: null,
  sessionsStatus: 'idle',
  messagesStatus: 'idle',
  isEndOfHistory: false,
  categories: [],
  categoriesStatus: 'idle',

  loadSessions: async (limit = 50, offset = 0) => {
    set({ sessionsStatus: 'loading' })
    try {
      const result = await api.fetchSessions(limit, offset)
      set({
        sessions: result.sessions,
        sessionsStatus: 'idle',
        isEndOfHistory: result.count <= offset + limit,
      })
    } catch {
      set({ sessionsStatus: 'error' })
    }
  },

  fetchCategories: async () => {
    set({ categoriesStatus: 'loading' })
    try {
      const categories = await api.fetchCategories()
      set({ categories, categoriesStatus: 'idle' })
    } catch {
      set({ categoriesStatus: 'error' })
    }
  },

  loadMoreSessions: async () => {
    const state = get()
    if (state.isEndOfHistory || state.sessionsStatus === 'loading') return
    const offset = state.sessions.length
    try {
      const result = await api.fetchSessions(50, offset)
      set((s) => ({
        sessions: [...s.sessions, ...result.sessions],
        isEndOfHistory: result.count <= offset + result.sessions.length,
      }))
    } catch {
      // ignore
    }
  },

  createSession: async () => {
    // Optimistic: we need a session ID before we can navigate. The chat/stream endpoint
    // creates one server-side if none is provided. For the sidebar, we'll create a placeholder.
    const placeholder: ChatSessionSummary = {
      id: `opt-${Date.now()}`,
      title: 'New Chat',
    }
    set((state) => ({ sessions: [placeholder, ...state.sessions] }))
    return placeholder
  },

  deleteSession: async (id: string) => {
    try {
      await api.deleteSessionApi(id)
    } catch {
      // ignore
    }
    set((state) => {
      const { [id]: _, ...rest } = state.messagesBySessionId
      return {
        sessions: state.sessions.filter((s) => s.id !== id),
        messagesBySessionId: rest,
        activeSessionId: state.activeSessionId === id ? null : state.activeSessionId,
      }
    })
  },

  renameSession: async (id: string, title: string) => {
    const trimmed = title.trim()
    if (!trimmed) return

    const previousTitle = get().sessions.find((s) => s.id === id)?.title

    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === id ? { ...s, title: trimmed } : s)),
    }))

    try {
      await api.renameSessionApi(id, trimmed)
    } catch {
      // Roll back on failure so the UI doesn't show a title that never saved.
      set((state) => ({
        sessions: state.sessions.map((s) =>
          s.id === id ? { ...s, title: previousTitle ?? s.title } : s,
        ),
      }))
    }
  },

  setActiveSession: (id: string | null) => {
    set({ activeSessionId: id })
  },

  loadMessages: async (sessionId: string) => {
    set({ messagesStatus: 'loading' })
    try {
      const result = await api.fetchSession(sessionId)
      const categoryTag = result.session.category !== 'normalChat' ? result.session.category : ''
      const messages: MessageState[] = await Promise.all(
        result.messages.map(async (msg) => {
          const stored = msg.role !== 'user' ? await getStoredImages(sessionId, msg.id) : null
          return {
            type: msg.role === 'user' ? 'right' : 'left',
            content: msg.content,
            tag: categoryTag,
            cancelled: false,
            agentTools: [],
            agentReasoning: '',
            imageStatus: '',
            images: stored ?? [],
            slideStatus: '',
            slideStages: {},
            slides: [],
            sources: msg.sources ?? [],
            artifacts: msg.artifacts ?? [],
            isRagMessage: result.session.category !== 'normalChat',
            assistantMessageId: msg.id,
            uuid: uuidv4(),
            file: null,
            dbId: msg.id,
          }
        }),
      )

      set((state) => {
        const sessions = state.sessions.some((s) => s.id === sessionId)
          ? state.sessions.map((s) =>
              s.id === sessionId ? { ...s, title: result.session.title } : s,
            )
          : state.sessions

        return {
          messagesBySessionId: { ...state.messagesBySessionId, [sessionId]: messages },
          messagesStatus: 'idle',
          sessions,
        }
      })
    } catch {
      set({ messagesStatus: 'error' })
    }
  },

  sendChatMessage: async (sessionId, message, opts) => {
    const state = get()
    const userMsg = createMessageState('user', message)
    if (opts?.file) {
      userMsg.file = { name: opts.file.name, type: opts.file.type, size: opts.file.size }
    }
    const assistantMsg = createMessageState('assistant')
    assistantMsg.uuid = uuidv4()

    const existing = state.messagesBySessionId[sessionId] ?? []
    const isPlaceholder = sessionId.startsWith('opt-')

    set({
      messagesBySessionId: {
        ...state.messagesBySessionId,
        [sessionId]: [...existing, userMsg, assistantMsg],
      },
      isStreaming: true,
      streamingMessageId: assistantMsg.uuid,
    })

    abortController = new AbortController()

    // If this is still a local-only placeholder id, don't send it -- the
    // backend will mint a real one. Otherwise pass it along so the backend
    // continues *this* conversation instead of quietly starting a new one
    // (which is what was causing duplicate entries to appear in the sidebar).
    let realSessionId: string | null = null

    try {
      await api.chatStream(
        {
          message,
          session_id: isPlaceholder ? undefined : sessionId,
          mode: opts?.mode,
          internet_search: opts?.internet_search,
          slide_mode: opts?.slide_mode,
          agent_mode: opts?.agent_mode,
          file: opts?.file,
        },
        {
          onToken: (token) => {
            set((s) => {
              const msgs = s.messagesBySessionId[sessionId] ?? []
              const updated = msgs.map((m) =>
                m.uuid === s.streamingMessageId
                  ? { ...m, content: m.content + token }
                  : m,
              )
              return {
                messagesBySessionId: { ...s.messagesBySessionId, [sessionId]: updated },
              }
            })
          },
          onTitleUpdated: (data) => {
            if (isPlaceholder && data.session_id !== sessionId) {
              realSessionId = data.session_id
            }
            set((s) => {
              // Replace our optimistic placeholder (or an existing real entry
              // with this id) rather than blindly prepending -- prepending
              // unconditionally is what produced the duplicate-looking rows.
              const withoutStale = s.sessions.filter(
                (sess) => sess.id !== sessionId && sess.id !== data.session_id,
              )
              return {
                sessions: [{ id: data.session_id, title: data.session_title }, ...withoutStale],
              }
            })
          },
          onAgentTools: (data) => {
            set((s) => {
              const msgs = s.messagesBySessionId[sessionId] ?? []
              const updated = msgs.map((m) =>
                m.uuid === s.streamingMessageId
                  ? { ...m, agentTools: data.tools, agentReasoning: data.reasoning ?? '' }
                  : m,
              )
              return {
                messagesBySessionId: { ...s.messagesBySessionId, [sessionId]: updated },
              }
            })
          },
          onArtifact: (artifact) => {
            set((s) => {
              const msgs = s.messagesBySessionId[sessionId] ?? []
              const updated = msgs.map((m) =>
                m.uuid === s.streamingMessageId
                  ? { ...m, artifacts: [...m.artifacts, artifact as unknown as ArtifactData] }
                  : m,
              )
              return {
                messagesBySessionId: { ...s.messagesBySessionId, [sessionId]: updated },
              }
            })
          },
          onImage: (image) => {
            set((s) => {
              const msgs = s.messagesBySessionId[sessionId] ?? []
              const updated = msgs.map((m) =>
                m.uuid === s.streamingMessageId
                  ? { ...m, images: [...m.images, image as GeneratedImage], imageStatus: '' }
                  : m,
              )
              // Persist to IndexedDB
              const streamingMsg = msgs.find((m) => m.uuid === s.streamingMessageId)
              if (streamingMsg?.assistantMessageId) {
                const currentImages = [...(streamingMsg.images as GeneratedImage[]), image as GeneratedImage]
                storeImages(sessionId, streamingMsg.assistantMessageId, currentImages)
              }
              return {
                messagesBySessionId: { ...s.messagesBySessionId, [sessionId]: updated },
              }
            })
          },
          onImageStatus: (message) => {
            set((s) => {
              const msgs = s.messagesBySessionId[sessionId] ?? []
              const updated = msgs.map((m) =>
                m.uuid === s.streamingMessageId
                  ? { ...m, imageStatus: message }
                  : m,
              )
              return {
                messagesBySessionId: { ...s.messagesBySessionId, [sessionId]: updated },
              }
            })
          },
          onSlide: (slide) => {
            set((s) => {
              const msgs = s.messagesBySessionId[sessionId] ?? []
              const updated = msgs.map((m) =>
                m.uuid === s.streamingMessageId
                  ? { ...m, slides: [...m.slides, slide as unknown as SlideDeck], slideStatus: '', slideStages: {} }
                  : m,
              )
              return {
                messagesBySessionId: { ...s.messagesBySessionId, [sessionId]: updated },
              }
            })
          },
          onSlideStatus: (data) => {
            set((s) => {
              const msgs = s.messagesBySessionId[sessionId] ?? []
              const updated = msgs.map((m) => {
                if (m.uuid !== s.streamingMessageId) return m
                const stages = { ...m.slideStages }
                stages[data.stage] = {
                  stage: data.stage as SlideStageId,
                  stage_status: data.stage_status as SlideStageStatus,
                  message: data.message,
                }
                return { ...m, slideStages: stages, slideStatus: '' }
              })
              return {
                messagesBySessionId: { ...s.messagesBySessionId, [sessionId]: updated },
              }
            })
          },
          onSources: (sources) => {
            set((s) => {
              const msgs = s.messagesBySessionId[sessionId] ?? []
              const updated = msgs.map((m) =>
                m.uuid === s.streamingMessageId
                  ? { ...m, sources: sources as SourceLink[] }
                  : m,
              )
              return {
                messagesBySessionId: { ...s.messagesBySessionId, [sessionId]: updated },
              }
            })
          },
          onDone: (assistantMessageId) => {
            set((s) => {
              const msgs = s.messagesBySessionId[sessionId] ?? []
              const updated = msgs.map((m) => {
                if (m.uuid !== s.streamingMessageId) return m
                const msgId = assistantMessageId ?? null
                if (msgId && m.images.length > 0) {
                  storeImages(sessionId, msgId, m.images as GeneratedImage[])
                }
                return { ...m, assistantMessageId: msgId }
              })
              return {
                messagesBySessionId: { ...s.messagesBySessionId, [sessionId]: updated },
                isStreaming: false,
                streamingMessageId: null,
              }
            })
          },
        },
        abortController.signal,
      )
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        set((s) => {
          const msgs = s.messagesBySessionId[sessionId] ?? []
          const updated = msgs.map((m) =>
            m.uuid === s.streamingMessageId ? { ...m, cancelled: true } : m,
          )
          return {
            messagesBySessionId: { ...s.messagesBySessionId, [sessionId]: updated },
            isStreaming: false,
            streamingMessageId: null,
          }
        })
      } else {
        set({ isStreaming: false, streamingMessageId: null })
      }
    }

    if (realSessionId) {
      const newId: string = realSessionId
      set((s) => {
        const { [sessionId]: messagesToMove, ...restMessages } = s.messagesBySessionId
        return {
          messagesBySessionId: { ...restMessages, [newId]: messagesToMove ?? [] },
          activeSessionId: s.activeSessionId === sessionId ? newId : s.activeSessionId,
        }
      })
      return newId
    }

    return sessionId
  },

  sendRagMessage: async (sessionId, query, category, opts) => {
    const state = get()
    const userMsg = createMessageState('user', query)
    userMsg.tag = category
    const assistantMsg = createMessageState('assistant')
    assistantMsg.isRagMessage = true
    assistantMsg.tag = category
    assistantMsg.uuid = uuidv4()

    const existing = state.messagesBySessionId[sessionId] ?? []

    set({
      messagesBySessionId: {
        ...state.messagesBySessionId,
        [sessionId]: [...existing, userMsg, assistantMsg],
      },
      isStreaming: true,
      streamingMessageId: assistantMsg.uuid,
    })

    abortController = new AbortController()

    try {
      await api.queryStream(
        {
          query,
          category,
          session_id: sessionId.startsWith('opt-') ? undefined : sessionId,
          top_k: opts?.top_k ?? '5',
          show_context: opts?.show_context,
          mode: opts?.mode,
          internet_search: opts?.internet_search,
          agent_mode: opts?.agent_mode,
        },
        {
          onToken: (token) => {
            set((s) => {
              const msgs = s.messagesBySessionId[sessionId] ?? []
              const updated = msgs.map((m) =>
                m.uuid === s.streamingMessageId
                  ? { ...m, content: m.content + token }
                  : m,
              )
              return {
                messagesBySessionId: { ...s.messagesBySessionId, [sessionId]: updated },
              }
            })
          },
          onSources: (sources) => {
            set((s) => {
              const msgs = s.messagesBySessionId[sessionId] ?? []
              const updated = msgs.map((m) =>
                m.uuid === s.streamingMessageId
                  ? { ...m, sources: sources as SourceLink[] }
                  : m,
              )
              return {
                messagesBySessionId: { ...s.messagesBySessionId, [sessionId]: updated },
              }
            })
          },
          onDone: (assistantMessageId) => {
            set((s) => {
              const msgs = s.messagesBySessionId[sessionId] ?? []
              const updated = msgs.map((m) => {
                if (m.uuid !== s.streamingMessageId) return m
                const msgId = assistantMessageId ?? null
                if (msgId && m.images.length > 0) {
                  storeImages(sessionId, msgId, m.images as GeneratedImage[])
                }
                return { ...m, assistantMessageId: msgId }
              })
              return {
                messagesBySessionId: { ...s.messagesBySessionId, [sessionId]: updated },
                isStreaming: false,
                streamingMessageId: null,
              }
            })
          },
        },
        abortController.signal,
      )
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        set((s) => {
          const msgs = s.messagesBySessionId[sessionId] ?? []
          const updated = msgs.map((m) =>
            m.uuid === s.streamingMessageId ? { ...m, cancelled: true } : m,
          )
          return {
            messagesBySessionId: { ...s.messagesBySessionId, [sessionId]: updated },
            isStreaming: false,
            streamingMessageId: null,
          }
        })
      } else {
        set({ isStreaming: false, streamingMessageId: null })
      }
    }
  },

  stopStreaming: () => {
    if (abortController) {
      abortController.abort()
      abortController = null
    }
    if (currentRequestId) {
      api.cancelRequest(currentRequestId).catch(() => {})
      currentRequestId = null
    }
  },

  regenerateMessage: async (sessionId: string, assistantMessageId: number) => {
    const state = get()
    const msgs = state.messagesBySessionId[sessionId] ?? []

    // Find the assistant message being regenerated
    const msgIndex = msgs.findIndex((m) => m.assistantMessageId === assistantMessageId)
    if (msgIndex === -1) return

    // Find the preceding user message
    let userIndex = -1
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (msgs[i].type === 'right') {
        userIndex = i
        break
      }
    }
    if (userIndex === -1) return

    const userMsg = msgs[userIndex]
    const truncateId = userMsg.dbId

    // Truncate on server from this user message onwards
    if (truncateId) {
      try {
        await api.truncateMessages(sessionId, { from_message_id: truncateId })
      } catch {
        // ignore
      }
    }

    // Truncate locally from this user message onwards
    const trimmed = msgs.slice(0, userIndex)
    set({
      messagesBySessionId: { ...state.messagesBySessionId, [sessionId]: trimmed },
    })

    // Re-send the user message content
    await get().sendChatMessage(sessionId, userMsg.content)
  },

  editAndResend: async (sessionId, fromMessageId, newContent) => {
    // Truncate messages on server
    try {
      await api.truncateMessages(sessionId, { from_message_id: fromMessageId })
    } catch {
      // ignore
    }

    // Truncate locally
    const state = get()
    const msgs = state.messagesBySessionId[sessionId] ?? []
    const truncateIndex = msgs.findIndex((m) => m.dbId === fromMessageId)
    if (truncateIndex >= 0) {
      const trimmed = msgs.slice(0, truncateIndex)
      set({
        messagesBySessionId: { ...state.messagesBySessionId, [sessionId]: trimmed },
      })
    }

    // Send the new message
    await get().sendChatMessage(sessionId, newContent)
  },

  submitFeedback: async (messageId, isHelpful) => {
    try {
      await api.submitFeedback(messageId, { is_helpful: isHelpful })
    } catch {
      // ignore
    }
    // Update local state immediately
    set((state) => {
      const updatedMsgs: Record<string, MessageState[]> = {}
      for (const [sid, msgs] of Object.entries(state.messagesBySessionId)) {
        updatedMsgs[sid] = msgs.map((m) =>
          m.assistantMessageId === messageId ? { ...m, is_helpful: isHelpful } : m,
        )
      }
      return { messagesBySessionId: updatedMsgs }
    })
  },

  regenerateSlide: async (deckId, slideId, instruction) => {
    try {
      const result = await api.regenerateSlide(deckId, slideId, { instruction })
      // Update the slide HTML in the messages
      set((state) => {
        const updatedMsgs: Record<string, MessageState[]> = {}
        for (const [sessionId, msgs] of Object.entries(state.messagesBySessionId)) {
          updatedMsgs[sessionId] = msgs.map((msg) => ({
            ...msg,
            slides: msg.slides.map((deck) =>
              deck.deckId === result.deck_id
                ? {
                    ...deck,
                    html: result.html_fragment ?? deck.html,
                    pptxUrl: result.pptx_url,
                  }
                : deck,
            ),
          }))
        }
        return { messagesBySessionId: updatedMsgs }
      })
    } catch {
      // ignore
    }
  },
}))
