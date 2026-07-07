import axios from 'axios'
import type {
  AuthResponse,
  LoginRequest,
  ChatSession,
  ChatMessage,
  SendMessageRequest,
  FeedbackRequest,
} from '@/types'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth-token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
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

export async function login(data: LoginRequest): Promise<AuthResponse> {
  const res = await apiClient.post('/auth/login', data)
  return res.data
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout')
}

export async function getMe(): Promise<{ user: import('@/types').User }> {
  const res = await apiClient.get('/auth/me')
  return res.data
}

export async function fetchSessions(): Promise<ChatSession[]> {
  const res = await apiClient.get('/sessions')
  return res.data
}

export async function createSession(title?: string): Promise<ChatSession> {
  const res = await apiClient.post('/sessions', { title })
  return res.data
}

export async function renameSession(id: string, title: string): Promise<ChatSession> {
  const res = await apiClient.patch(`/sessions/${id}`, { title })
  return res.data
}

export async function deleteSessionApi(id: string): Promise<void> {
  await apiClient.delete(`/sessions/${id}`)
}

export async function fetchMessages(sessionId: string): Promise<ChatMessage[]> {
  const res = await apiClient.get(`/sessions/${sessionId}/messages`)
  return res.data
}

export async function sendMessage(
  sessionId: string,
  data: SendMessageRequest,
): Promise<ChatMessage> {
  const res = await apiClient.post(`/sessions/${sessionId}/messages`, data)
  return res.data
}

export async function sendMessageStream(
  sessionId: string,
  data: SendMessageRequest,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<ChatMessage> {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL ?? '/api'}/sessions/${sessionId}/messages/stream`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('auth-token')}`,
      },
      body: JSON.stringify(data),
      signal,
    },
  )

  if (!response.ok) {
    throw new Error('Failed to send message')
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let fullContent = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    fullContent += chunk
    onChunk(chunk)
  }

  return {
    id: `msg-${Date.now()}`,
    sessionId,
    role: 'assistant',
    content: fullContent,
    timestamp: new Date().toISOString(),
  }
}

export async function regenerateMessage(messageId: string): Promise<ChatMessage> {
  const res = await apiClient.post(`/messages/${messageId}/regenerate`)
  return res.data
}

export async function submitFeedback(messageId: string, data: FeedbackRequest): Promise<void> {
  await apiClient.post(`/messages/${messageId}/feedback`, data)
}

export async function uploadFile(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<{
  id: string
  filename: string
  filetype: string
  size: number
  url: string
}> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await apiClient.post('/files', formData, {
    onUploadProgress: (e) => {
      if (e.total && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    },
  })
  return res.data
}

export async function getFile(id: string): Promise<{
  id: string
  filename: string
  filetype: string
  size: number
  url: string
  content?: string
}> {
  const res = await apiClient.get(`/files/${id}`)
  return res.data
}

export default apiClient
