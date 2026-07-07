export interface User {
  id: string
  email: string
  name: string
  employeeId: string
}

export interface ChatSession {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export interface Attachment {
  id: string
  filename: string
  filetype: string
  size: number
  url: string
}

export interface Artifact {
  id: string
  type: 'code' | 'html' | 'svg' | 'markdown'
  language?: string
  title: string
  content: string
}

export interface Feedback {
  rating: 'helpful' | 'not_helpful'
  comment?: string
}

export interface ChatMessage {
  id: string
  sessionId: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  attachments?: Attachment[]
  artifacts?: Artifact[]
  feedback?: Feedback
}

export interface AuthResponse {
  token: string
  user: User
}

export interface LoginRequest {
  email: string
  password: string
}

export interface SendMessageRequest {
  content: string
  attachments?: string[]
}

export interface FeedbackRequest {
  rating: 'helpful' | 'not_helpful'
  comment?: string
}
