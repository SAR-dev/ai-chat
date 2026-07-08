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
import { applyPinnedState, setSessionPinned, clearSessionPinned } from '@/lib/pinnedSessions'

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
  deleteSession: (id: string) => Promise<void>
  togglePinSession: (id: string) => Promise<void>
  setActiveSession: (id: string | null) => void
  loadMessages: (sessionId: string) => Promise<void>

  sendChatMessage: (
    sessionId: string | null,
    message: string,
    opts?: {
      mode?: 'fast' | 'thinking'
      internet_search?: boolean
      slide_mode?: 'standard' | 'creative'
      agent_mode?: boolean
      file?: File
    },
    /**
     * Called as soon as the backend creates a new session (only fires when
     * sessionId is null). The caller can navigate to `/chat/{newSessionId}`
     * immediately without waiting for the full stream to finish.
     */
    onNewSession?: (newSessionId: string) => void,
  ) => Promise<string>

  sendRagMessage: (
    sessionId: string | null,
    query: string,
    category: string,
    opts?: {
      top_k?: string
      show_context?: boolean
      mode?: 'fast' | 'thinking'
      internet_search?: boolean
      agent_mode?: boolean
    },
    onNewSession?: (newSessionId: string) => void,
  ) => Promise<void>

  stopStreaming: () => void
  regenerateMessage: (sessionId: string, messageId: number) => Promise<void>
  editAndResend: (sessionId: string, fromMessageId: number, newContent: string) => Promise<void>
  submitFeedback: (messageId: number, isHelpful: boolean | null) => Promise<void>
  regenerateSlide: (deckId: string, slideId: number, instruction: string) => Promise<void>
}

let abortController: AbortController | null = null

function createMessageState(role: 'user' | 'assistant', content = ''): MessageState {
  return {
    type: role == 'user' ? 'right' : 'left',
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
      const sessions = await applyPinnedState(result.sessions)
      set({
        sessions,
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
    if (state.isEndOfHistory || state.sessionsStatus == 'loading') return
    const offset = state.sessions.length
    try {
      const result = await api.fetchSessions(50, offset)
      const newSessions = await applyPinnedState(result.sessions)
      set((s) => ({
        sessions: [...s.sessions, ...newSessions],
        isEndOfHistory: result.count <= offset + result.sessions.length,
      }))
    } catch {
      void 0
    }
  },

  deleteSession: async (id: string) => {
    try {
      await api.deleteSessionApi(id)
    } catch {
      void 0
    }
    await clearSessionPinned(id)
    set((state) => {
      const rest = { ...state.messagesBySessionId }
      delete rest[id]
      return {
        sessions: state.sessions.filter((s) => s.id !== id),
        messagesBySessionId: rest,
        activeSessionId: state.activeSessionId == id ? null : state.activeSessionId,
      }
    })
  },

  togglePinSession: async (id: string) => {
    const state = get()
    const session = state.sessions.find((s) => s.id == id)
    if (!session) return
    const newPinned = !session.pinned

    // Pin state is managed entirely on the client (IndexedDB) — no API call.
    set((s) => ({
      sessions: s.sessions
        .map((sess) => (sess.id == id ? { ...sess, pinned: newPinned } : sess))
        .sort((a, b) => {
          if (a.pinned && !b.pinned) return -1
          if (!a.pinned && b.pinned) return 1
          return 0
        }),
    }))

    await setSessionPinned(id, newPinned)
  },

  setActiveSession: (id: string | null) => {
    set({ activeSessionId: id })
  },

  loadMessages: async (sessionId: string) => {
    set({ messagesStatus: 'loading' })
    try {
      const result = await api.fetchSession(sessionId)
      const categoryTag = result.session.category !== 'normalChat' ? result.session.category : ''
      // Snapshot whatever's already in memory for this session before we
      // overwrite it. The history endpoint doesn't reliably return `slides`
      // for every message (e.g. a deck generated moments ago via the live
      // SSE stream may not have round-tripped to the DB and back yet), so
      // rather than reset to `[]` and make a just-generated deck vanish, we
      // fall back to whatever slide data this message already has locally.
      const existingBySessionId = new Map(
        (get().messagesBySessionId[sessionId] ?? []).map((m) => [m.dbId, m]),
      )
      const messages: MessageState[] = await Promise.all(
        result.messages.map(async (msg) => {
          const stored = msg.role !== 'user' ? await getStoredImages(sessionId, msg.id) : null
          const existing = existingBySessionId.get(msg.id)
          return {
            type: msg.role == 'user' ? 'right' : 'left',
            content: msg.content,
            tag: categoryTag,
            cancelled: false,
            agentTools: [],
            agentReasoning: '',
            imageStatus: '',
            images: stored ?? [],
            slideStatus: '',
            slideStages: {},
            slides: msg.slides ?? existing?.slides ?? [],
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
        const sessions = state.sessions.some((s) => s.id == sessionId)
          ? state.sessions.map((s) =>
            s.id == sessionId ? { ...s, title: result.session.title } : s,
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

  sendChatMessage: async (sessionId, message, opts, onNewSession) => {
    const state = get()
    const userMsg = createMessageState('user', message)
    if (opts?.file) {
      userMsg.file = { name: opts.file.name, type: opts.file.type, size: opts.file.size }
    }
    const assistantMsg = createMessageState('assistant')
    assistantMsg.uuid = uuidv4()

    const isNewChat = sessionId == null
    const tempKey = '__new__'
    let storageKey = isNewChat ? tempKey : sessionId

    const existing = state.messagesBySessionId[storageKey] ?? []

    set({
      messagesBySessionId: {
        ...state.messagesBySessionId,
        [storageKey]: [...existing, userMsg, assistantMsg],
      },
      isStreaming: true,
      streamingMessageId: assistantMsg.uuid,
    })

    abortController = new AbortController()

    let realSessionId: string | null = null

    try {
      await api.chatStream(
        {
          message,
          session_id: isNewChat ? undefined : sessionId,
          mode: opts?.mode,
          internet_search: opts?.internet_search,
          slide_mode: opts?.slide_mode,
          agent_mode: opts?.agent_mode,
          file: opts?.file,
        },
        {
          onToken: (token) => {
            set((s) => {
              const msgs = s.messagesBySessionId[storageKey] ?? []
              const updated = msgs.map((m) =>
                m.uuid == s.streamingMessageId
                  ? { ...m, content: m.content + token }
                  : m,
              )
              return {
                messagesBySessionId: { ...s.messagesBySessionId, [storageKey]: updated },
              }
            })
          },
          onSessionId: (sid) => {
            if (isNewChat && sid && !realSessionId) {
              realSessionId = sid

              const msgs = get().messagesBySessionId[tempKey] ?? []
              set((s) => {
                const rest = { ...s.messagesBySessionId }
                delete rest[tempKey]
                return {
                  messagesBySessionId: { ...rest, [sid]: msgs },
                  sessions: [{ id: sid, title: 'New Chat' }, ...s.sessions],
                  activeSessionId: sid,
                }
              })
              storageKey = sid
              onNewSession?.(sid)
            }
          },
          onTitleUpdated: (data) => {
            if (isNewChat && data.session_id) {
              // Update the title from a title_updated SSE event
              set((s) => ({
                sessions: s.sessions.map((sess) =>
                  sess.id == data.session_id
                    ? { ...sess, title: data.session_title }
                    : sess,
                ),
              }))
            } else {
              set((s) => ({
                sessions: s.sessions.map((sess) =>
                  sess.id == sessionId ? { ...sess, title: data.session_title } : sess,
                ),
              }))
            }
          },
          onAgentTools: (data) => {
            set((s) => {
              const msgs = s.messagesBySessionId[storageKey] ?? []
              const updated = msgs.map((m) =>
                m.uuid == s.streamingMessageId
                  ? { ...m, agentTools: data.tools, agentReasoning: data.reasoning ?? '' }
                  : m,
              )
              return {
                messagesBySessionId: { ...s.messagesBySessionId, [storageKey]: updated },
              }
            })
          },
          onArtifact: (artifact) => {
            set((s) => {
              const msgs = s.messagesBySessionId[storageKey] ?? []
              const updated = msgs.map((m) =>
                m.uuid == s.streamingMessageId
                  ? { ...m, artifacts: [...m.artifacts, artifact as unknown as ArtifactData] }
                  : m,
              )
              return {
                messagesBySessionId: { ...s.messagesBySessionId, [storageKey]: updated },
              }
            })
          },
          onImage: (image) => {
            set((s) => {
              const msgs = s.messagesBySessionId[storageKey] ?? []
              const updated = msgs.map((m) =>
                m.uuid == s.streamingMessageId
                  ? { ...m, images: [...m.images, image as GeneratedImage], imageStatus: '' }
                  : m,
              )
              return {
                messagesBySessionId: { ...s.messagesBySessionId, [storageKey]: updated },
              }
            })
          },
          onImageStatus: (message) => {
            set((s) => {
              const msgs = s.messagesBySessionId[storageKey] ?? []
              const updated = msgs.map((m) =>
                m.uuid == s.streamingMessageId
                  ? { ...m, imageStatus: message }
                  : m,
              )
              return {
                messagesBySessionId: { ...s.messagesBySessionId, [storageKey]: updated },
              }
            })
          },
          onSlide: (slide) => {
            set((s) => {
              const msgs = s.messagesBySessionId[storageKey] ?? []
              const updated = msgs.map((m) =>
                m.uuid == s.streamingMessageId
                  ? { ...m, slides: [...m.slides, slide as unknown as SlideDeck], slideStatus: '', slideStages: {} }
                  : m,
              )
              return {
                messagesBySessionId: { ...s.messagesBySessionId, [storageKey]: updated },
              }
            })
          },
          onSlideStatus: (data) => {
            set((s) => {
              const msgs = s.messagesBySessionId[storageKey] ?? []
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
                messagesBySessionId: { ...s.messagesBySessionId, [storageKey]: updated },
              }
            })
          },
          onSources: (sources) => {
            set((s) => {
              const msgs = s.messagesBySessionId[storageKey] ?? []
              const updated = msgs.map((m) =>
                m.uuid == s.streamingMessageId
                  ? { ...m, sources: sources as SourceLink[] }
                  : m,
              )
              return {
                messagesBySessionId: { ...s.messagesBySessionId, [storageKey]: updated },
              }
            })
          },
          onDone: (assistantMessageId) => {
            const imagesToStore: { sessionId: string; msgId: number; images: GeneratedImage[] }[] = []
            set((s) => {
              const msgs = s.messagesBySessionId[storageKey] ?? []
              const updated = msgs.map((m) => {
                if (m.uuid !== s.streamingMessageId) return m
                const msgId = assistantMessageId ?? null
                if (msgId && m.images.length > 0) {
                  imagesToStore.push({ sessionId: storageKey, msgId, images: m.images as GeneratedImage[] })
                }
                // `dbId` and `assistantMessageId` represent the same server
                // id and must stay in sync -- loadMessages() looks messages
                // up by `dbId` to preserve state (like just-generated slides)
                // that the history endpoint doesn't return yet.
                return { ...m, assistantMessageId: msgId, dbId: msgId }
              })
              return {
                messagesBySessionId: { ...s.messagesBySessionId, [storageKey]: updated },
                isStreaming: false,
                streamingMessageId: null,
              }
            })
            for (const { sessionId: sid, msgId, images } of imagesToStore) {
              storeImages(sid, msgId, images)
            }
          },
        },
        abortController.signal,
      )
    } catch (e) {
      if ((e as Error).name == 'AbortError') {
        set((s) => {
          const msgs = s.messagesBySessionId[storageKey] ?? []
          const updated = msgs.map((m) =>
            m.uuid == s.streamingMessageId ? { ...m, cancelled: true } : m,
          )
          return {
            messagesBySessionId: { ...s.messagesBySessionId, [storageKey]: updated },
            isStreaming: false,
            streamingMessageId: null,
          }
        })
      } else {
        set({ isStreaming: false, streamingMessageId: null })
      }
    }

    return realSessionId ?? sessionId ?? ''
  },

  sendRagMessage: async (sessionId, query, category, opts, onNewSession) => {
    const state = get()
    const userMsg = createMessageState('user', query)
    userMsg.tag = category
    const assistantMsg = createMessageState('assistant')
    assistantMsg.isRagMessage = true
    assistantMsg.tag = category
    assistantMsg.uuid = uuidv4()

    const isNewChat = sessionId == null
    const tempKey = '__new__'
    let storageKey = isNewChat ? tempKey : sessionId

    const existing = state.messagesBySessionId[storageKey] ?? []

    set({
      messagesBySessionId: {
        ...state.messagesBySessionId,
        [storageKey]: [...existing, userMsg, assistantMsg],
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
          session_id: isNewChat ? undefined : sessionId,
          top_k: opts?.top_k ?? '5',
          show_context: opts?.show_context,
          mode: opts?.mode,
          internet_search: opts?.internet_search,
          agent_mode: opts?.agent_mode,
        },
        {
          onToken: (token) => {
            set((s) => {
              const msgs = s.messagesBySessionId[storageKey] ?? []
              const updated = msgs.map((m) =>
                m.uuid == s.streamingMessageId
                  ? { ...m, content: m.content + token }
                  : m,
              )
              return {
                messagesBySessionId: { ...s.messagesBySessionId, [storageKey]: updated },
              }
            })
          },
          onTitleUpdated: (data) => {
            set((s) => ({
              sessions: s.sessions.map((sess) =>
                sess.id == data.session_id
                  ? { ...sess, title: data.session_title }
                  : sess,
              ),
            }))
          },
          onSessionId: (sid) => {
            if (isNewChat && sid) {
              // Guard: only migrate on the first session ID we receive
              if (get().sessions.some((s) => s.id == sid)) {
                return
              }
              const msgs = get().messagesBySessionId[tempKey] ?? []
              set((s) => {
                const rest = { ...s.messagesBySessionId }
                delete rest[tempKey]
                return {
                  messagesBySessionId: { ...rest, [sid]: msgs },
                  sessions: [{ id: sid, title: 'New Chat' }, ...s.sessions],
                  activeSessionId: sid,
                }
              })
              storageKey = sid
              onNewSession?.(sid)
            }
          },
          onSources: (sources) => {
            set((s) => {
              const msgs = s.messagesBySessionId[storageKey] ?? []
              const updated = msgs.map((m) =>
                m.uuid == s.streamingMessageId
                  ? { ...m, sources: sources as SourceLink[] }
                  : m,
              )
              return {
                messagesBySessionId: { ...s.messagesBySessionId, [storageKey]: updated },
              }
            })
          },
          onDone: (assistantMessageId) => {
            const imagesToStore: { sessionId: string; msgId: number; images: GeneratedImage[] }[] = []
            set((s) => {
              const msgs = s.messagesBySessionId[storageKey] ?? []
              const updated = msgs.map((m) => {
                if (m.uuid !== s.streamingMessageId) return m
                const msgId = assistantMessageId ?? null
                if (msgId && m.images.length > 0) {
                  imagesToStore.push({ sessionId: storageKey, msgId, images: m.images as GeneratedImage[] })
                }
                // `dbId` and `assistantMessageId` represent the same server
                // id and must stay in sync -- loadMessages() looks messages
                // up by `dbId` to preserve state (like just-generated slides)
                // that the history endpoint doesn't return yet.
                return { ...m, assistantMessageId: msgId, dbId: msgId }
              })
              return {
                messagesBySessionId: { ...s.messagesBySessionId, [storageKey]: updated },
                isStreaming: false,
                streamingMessageId: null,
              }
            })
            for (const { sessionId: sid, msgId, images } of imagesToStore) {
              storeImages(sid, msgId, images)
            }
          },
        },
        abortController.signal,
      )
    } catch (e) {
      if ((e as Error).name == 'AbortError') {
        set((s) => {
          const msgs = s.messagesBySessionId[storageKey] ?? []
          const updated = msgs.map((m) =>
            m.uuid == s.streamingMessageId ? { ...m, cancelled: true } : m,
          )
          return {
            messagesBySessionId: { ...s.messagesBySessionId, [storageKey]: updated },
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
  },

  regenerateMessage: async (sessionId: string, assistantMessageId: number) => {
    const state = get()
    const msgs = state.messagesBySessionId[sessionId] ?? []

    const msgIndex = msgs.findIndex((m) => m.assistantMessageId == assistantMessageId)
    if (msgIndex == -1) return

    let userIndex = -1
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (msgs[i].type == 'right') {
        userIndex = i
        break
      }
    }
    if (userIndex == -1) return

    const userMsg = msgs[userIndex]
    const truncateId = userMsg.dbId

    if (truncateId) {
      try {
        await api.truncateMessages(sessionId, { from_message_id: truncateId })
      } catch {
        void 0
      }
    }

    const trimmed = msgs.slice(0, userIndex)
    set({
      messagesBySessionId: { ...state.messagesBySessionId, [sessionId]: trimmed },
    })

    await get().sendChatMessage(sessionId, userMsg.content)
  },

  editAndResend: async (sessionId, fromMessageId, newContent) => {
    try {
      await api.truncateMessages(sessionId, { from_message_id: fromMessageId })
    } catch {
      void 0
    }

    const state = get()
    const msgs = state.messagesBySessionId[sessionId] ?? []
    const truncateIndex = msgs.findIndex((m) => m.dbId == fromMessageId)
    if (truncateIndex >= 0) {
      const trimmed = msgs.slice(0, truncateIndex)
      set({
        messagesBySessionId: { ...state.messagesBySessionId, [sessionId]: trimmed },
      })
    }

    await get().sendChatMessage(sessionId, newContent)
  },

  submitFeedback: async (messageId, isHelpful) => {
    try {
      await api.submitFeedback(messageId, { is_helpful: isHelpful })
    } catch {
      void 0
    }
    set((state) => {
      const updatedMsgs: Record<string, MessageState[]> = {}
      for (const [sid, msgs] of Object.entries(state.messagesBySessionId)) {
        updatedMsgs[sid] = msgs.map((m) =>
          m.assistantMessageId == messageId ? { ...m, is_helpful: isHelpful } : m,
        )
      }
      return { messagesBySessionId: updatedMsgs }
    })
  },

  regenerateSlide: async (deckId, slideId, instruction) => {
    try {
      const result = await api.regenerateSlide(deckId, slideId, { instruction })
      set((state) => {
        const updatedMsgs: Record<string, MessageState[]> = {}
        for (const [sessionId, msgs] of Object.entries(state.messagesBySessionId)) {
          updatedMsgs[sessionId] = msgs.map((msg) => ({
            ...msg,
            slides: msg.slides.map((deck) =>
              deck.deckId == result.deck_id
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
      void 0
    }
  },
}))
