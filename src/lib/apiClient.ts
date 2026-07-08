import axios from 'axios'
import type {
  LoginPayload,
  LoginResponse,
  ADLoginResponse,
  RegistrationRequest,
  RegistrationResponse,
  DefaultChatServicesRequest,
  RagChatRequest,
  ChatHistoryResponse,
  SessionHistoryResponse,
  FeedbackRequest,
  TruncateRequest,
  TruncateResponse,
  FeedbackResponse,
  GetUserSettingsResponse,
  UserSettings,
  RegenerateSlideResponse,
  SlideRegenerateRequest,
  CancelRequestResponse,
  ActiveRequestsResponse,
  ChatDownloadRequest,
  Category,
} from '@/types'

const TOKEN_KEY = 'kikuchat:user'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  withCredentials: true,
})

apiClient.interceptors.request.use((config) => {
  const stored = localStorage.getItem(TOKEN_KEY)
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      const token = parsed?.token ?? parsed?.state?.token
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    } catch {
      // ignore
    }
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error ?? error.message ?? 'Unknown error'
    return Promise.reject(new Error(message))
  },
)

// ── Auth ──

export async function login(data: LoginPayload): Promise<LoginResponse> {
  const res = await apiClient.post('/login', data)
  return res.data
}

export async function loginAD(data: LoginPayload): Promise<ADLoginResponse> {
  const res = await apiClient.post('/login/ad', data)
  return res.data
}

export async function register(data: RegistrationRequest): Promise<RegistrationResponse> {
  const res = await apiClient.post('/register', data)
  return res.data
}

// ── Chat Streaming (SSE) ──

export interface SSEStreamCallbacks {
  onToken?: (token: string) => void
  onTitleUpdated?: (data: { session_title: string; session_id: string }) => void
  onAgentTools?: (data: { tools: string[]; reasoning?: string }) => void
  onArtifact?: (artifact: Record<string, unknown>) => void
  onImage?: (image: { b64: string; prompt?: string; caption?: string; width?: number; height?: number }) => void
  onImageStatus?: (message: string) => void
  onSlide?: (slide: Record<string, unknown>) => void
  onSlideStatus?: (data: { stage: string; stage_status: string; message?: string }) => void
  onSources?: (sources: Array<{ index: number; title: string; url: string; date?: string }>) => void
  onDone?: (assistantMessageId?: number) => void
}

async function streamFromURL(
  url: string,
  body: unknown,
  callbacks: SSEStreamCallbacks,
  signal?: AbortSignal,
  isFormData = false,
): Promise<string> {
  const stored = localStorage.getItem(TOKEN_KEY)
  let token = ''
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      token = parsed?.token ?? parsed?.state?.token ?? ''
    } catch {
      // ignore
    }
  }

  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (!isFormData) headers['Content-Type'] = 'application/json'

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: isFormData ? (body as FormData) : JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    throw new Error(`Stream request failed: ${response.status}`)
  }

  const sessionId = response.headers.get('X-Session-Id') ?? ''

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  const buffer: string[] = []

  function flushBuffer() {
    if (buffer.length > 0) {
      const text = buffer.join('')
      buffer.length = 0
      callbacks.onToken?.(text)
    }
  }

  // SSE parsing
  let raw = ''
  let flushTimer: ReturnType<typeof setTimeout> | null = null

  function scheduleFlush() {
    if (flushTimer) clearTimeout(flushTimer)
    flushTimer = setTimeout(() => {
      flushBuffer()
      flushTimer = null
    }, 70)
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    raw += decoder.decode(value, { stream: true })

    // Parse SSE: split by double newline
    const parts = raw.split('\n\n')
    raw = parts.pop() ?? ''

    for (const part of parts) {
      if (!part.trim()) continue

      const lines = part.split('\n')
      let eventType = ''
      let dataStr = ''

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          eventType = line.slice(7).trim()
        } else if (line.startsWith('data: ')) {
          dataStr = line.slice(6).trim()
        }
      }

      if (!dataStr) continue

      try {
        const data = JSON.parse(dataStr)

        if (eventType === 'title_updated') {
          callbacks.onTitleUpdated?.(data)
          continue
        }

        if (eventType === 'agent_tools') {
          callbacks.onAgentTools?.(data)
          continue
        }

        // Events with type field in data
        if (data.type === 'artifact') {
          callbacks.onArtifact?.(data.artifact)
          continue
        }

        if (data.type === 'image') {
          callbacks.onImage?.(data.image)
          continue
        }

        if (data.type === 'image_status') {
          callbacks.onImageStatus?.(data.message)
          continue
        }

        if (data.type === 'slide') {
          callbacks.onSlide?.(data.slide)
          continue
        }

        if (data.type === 'slide_status') {
          callbacks.onSlideStatus?.(data)
          continue
        }

        if (data.type === 'sources') {
          callbacks.onSources?.(data.sources)
          continue
        }

        if (data.type === 'done') {
          flushBuffer()
          callbacks.onDone?.(data.assistant_message_id)
          continue
        }

        // Text tokens — accept any field
        const tokenText =
          data.content ?? data.chunk ?? data.delta ?? data.reply ?? data.answer ?? data.full_text ?? null
        if (tokenText !== null) {
          buffer.push(String(tokenText))
          scheduleFlush()
          continue
        }

        // Plain string
        if (typeof data === 'string') {
          buffer.push(data)
          scheduleFlush()
          continue
        }
      } catch {
        // Not JSON — treat as plain text token
        buffer.push(dataStr)
        scheduleFlush()
      }
    }
  }

  // Final flush
  flushBuffer()
  if (flushTimer) clearTimeout(flushTimer)

  return sessionId
}

export async function chatStream(
  data: DefaultChatServicesRequest,
  callbacks: SSEStreamCallbacks,
  signal?: AbortSignal,
): Promise<string> {
  const url = `${import.meta.env.VITE_API_BASE_URL ?? '/api'}/chat/stream`

  if (data.file) {
    const formData = new FormData()
    formData.append('file', data.file)
    formData.append('message', data.message)
    if (data.session_id) formData.append('session_id', data.session_id)
    if (data.mode) formData.append('mode', data.mode)
    if (data.internet_search !== undefined) formData.append('internet_search', String(data.internet_search))
    if (data.slide_mode) formData.append('slide_mode', data.slide_mode)
    if (data.agent_mode !== undefined) formData.append('agent_mode', String(data.agent_mode))

    return streamFromURL(url, formData, callbacks, signal, true)
  }

  return streamFromURL(url, data, callbacks, signal)
}

export async function queryStream(
  data: RagChatRequest,
  callbacks: SSEStreamCallbacks,
  signal?: AbortSignal,
): Promise<string> {
  const url = `${import.meta.env.VITE_API_BASE_URL ?? '/api'}/query/stream`
  return streamFromURL(url, data, callbacks, signal)
}

// ── Chat Download ──

export async function downloadChat(data: ChatDownloadRequest): Promise<Blob> {
  const res = await apiClient.post('/chat/download', data, {
    responseType: 'blob',
  })
  return res.data
}

// ── Sessions ──

export async function fetchSessions(limit?: number, offset?: number): Promise<SessionHistoryResponse> {
  const params: Record<string, string> = {}
  if (limit !== undefined) params.limit = String(limit)
  if (offset !== undefined) params.offset = String(offset)
  const res = await apiClient.get('/sessions', { params })
  return res.data
}

export async function fetchSession(sessionId: string): Promise<ChatHistoryResponse> {
  const res = await apiClient.get(`/sessions/${sessionId}`)
  return res.data
}

export async function deleteSessionApi(sessionId: string): Promise<void> {
  await apiClient.delete(`/sessions/${sessionId}`)
}

export async function truncateMessages(
  sessionId: string,
  data: TruncateRequest,
): Promise<TruncateResponse> {
  const res = await apiClient.post(`/sessions/${sessionId}/messages/truncate`, data)
  return res.data
}

// ── Feedback ──

export async function submitFeedback(
  messageId: number,
  data: FeedbackRequest,
): Promise<FeedbackResponse> {
  const res = await apiClient.post(`/messages/${messageId}/feedback`, data)
  return res.data
}

// ── Categories ──

export async function fetchCategories(): Promise<Category[]> {
  const res = await apiClient.get('/categories')
  return res.data
}

// ── User Settings ──

export async function fetchUserSettings(): Promise<GetUserSettingsResponse> {
  const res = await apiClient.get('/user/settings')
  return res.data
}

export async function updateUserSettings(data: UserSettings): Promise<UserSettings> {
  const res = await apiClient.patch('/user/settings', data)
  return res.data
}

// ── Slides ──

export async function regenerateSlide(
  deckId: string,
  slideId: number,
  data: SlideRegenerateRequest,
): Promise<RegenerateSlideResponse> {
  const res = await apiClient.post(`/slides/${deckId}/${slideId}/regenerate`, data)
  return res.data
}

// ── Request Management ──

export async function cancelRequest(requestId: string): Promise<CancelRequestResponse> {
  const res = await apiClient.post(`/request/cancel/${requestId}`)
  return res.data
}

export async function fetchActiveRequests(): Promise<ActiveRequestsResponse> {
  const res = await apiClient.get('/request/active')
  return res.data
}

export default apiClient
