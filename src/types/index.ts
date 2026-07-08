// ── Request types ──

export interface LoginPayload {
  username: string
  password: string
}

export interface RegistrationRequest {
  username: string
  password: string
  email: string
}

export interface DefaultChatServicesRequest {
  message: string
  session_id?: string
  mode?: 'fast' | 'thinking'
  internet_search?: boolean
  slide_mode?: 'standard' | 'creative'
  agent_mode?: boolean
  file?: File
}

export interface RagChatRequest {
  query: string
  show_context?: boolean
  top_k: string
  session_id?: string
  category: string
  mode?: 'fast' | 'thinking'
  internet_search?: boolean
  agent_mode?: boolean
}

export interface FeedbackRequest {
  is_helpful: boolean | null
}

export interface TruncateRequest {
  from_message_id: number
}

export interface UserSettings {
  agent_enabled: boolean
}

export interface SlideRegenerateRequest {
  instruction: string
}

// ── Response types ──

export interface User {
  id: number
  username: string
  email: string
  display_name?: string
  is_verified: boolean
  agent_enabled?: boolean
}

export interface LoginResponse {
  message: string
  recent_sessions: string[]
  token: string
  user: User
}

export interface ADLoginResponse {
  auth_method: string
  message: string
  recent_sessions: string[]
  token: string
  user: User
}

export interface RegistrationResponse {
  email: string
  message: string
  user_id: string
  username: string
  verification_required: boolean
  verification_token: string
}

export interface DefaultChatServicesResponse {
  session_id: string
  reply: string
  session_title?: string
  request_id?: string
}

export interface RagChatResponse {
  session_id: string
  question: string
  answer: string
  retrieved: unknown[]
  session_title?: string
  request_id?: string
}

// ── Session types ──

export interface ChatSessionSummary {
  id: string
  title: string
}

export interface SessionHistoryResponse {
  count: number
  sessions: ChatSessionSummary[]
}

export interface ChatSession {
  id: string
  title: string
  category: string
}

export interface SourceLink {
  index: number
  title: string
  url: string
  date?: string
}

export interface ArtifactData {
  artifact_type: 'chart' | 'kpi_card' | 'table'
  chart_type?: ChartType
  title: string
  subtitle?: string
  data?: Array<{ name: string; [key: string]: string | number }>
  series?: Array<{ key: string; label: string; color?: string; type?: string }>
  kpis?: Array<{ label: string; value: string; unit?: string; change?: string; trend?: 'up' | 'down' | 'neutral' }>
  config?: Record<string, unknown>
  [key: string]: unknown
}

export type ChartType = 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'forecast' | 'heatmap'

export interface GeneratedImage {
  b64: string
  prompt?: string
  caption?: string
  width?: number
  height?: number
}

export interface SlideStageEvent {
  stage: SlideStageId
  stage_status: SlideStageStatus
  message?: string
}

export type SlideStageId =
  | 'research'
  | 'style'
  | 'planning'
  | 'quality'
  | 'visual_identity'
  | 'images'
  | 'rendering'
  | 'validation'
  | 'packaging'

export type SlideStageStatus = 'active' | 'done' | 'skipped' | 'error' | 'pending'

export interface SlideDeck {
  html?: string
  title?: string
  slideCount?: number
  pptxUrl?: string
  deckId?: string
}

export interface ChatMessage {
  id: number
  content: string
  role: string
  created_at: string
  is_helpful?: boolean | null
  sources?: SourceLink[]
  artifacts?: ArtifactData[]
}

export interface ChatHistoryResponse {
  session: ChatSession
  messages: ChatMessage[]
}

export interface ChatDeleteResponse {
  message: string
}

export interface TruncateResponse {
  deleted: number
}

export interface FeedbackResponse {
  message: string
  message_id: number
  is_helpful: boolean
  cache_invalidated: boolean
}

// ── Settings ──

export interface GetUserSettingsResponse {
  agent_enabled: boolean
}

// ── Slides ──

export interface RegenerateSlideResponse {
  deck_id: string
  slide_id: number
  html_fragment: string | null
  pptx_url: string
}

// ── Request management ──

export interface CancelRequestResponse {
  message: string
  request_id: string
  status: string
}

export interface ActiveRequestsResponse {
  active_requests: ActiveRequest[]
  count: number
}

export interface ActiveRequest {
  request_id: string
  status: string
  created_at: string
}

// ── Categories ──

export interface Category {
  name: string
}

// ── SSE event types ──

export interface TitleUpdatedEvent {
  session_title: string
  session_id: string
}

export interface AgentToolsEvent {
  tools: string[]
  reasoning?: string
}

export interface SlideStatusEvent {
  stage: SlideStageId
  stage_status: SlideStageStatus
  message?: string
}

export interface SSEDoneEvent {
  type: 'done'
  assistant_message_id?: number
}

export interface SSESlideEvent {
  type: 'slide'
  slide: SlideDeck
}

export interface SSEImageEvent {
  type: 'image'
  image: GeneratedImage
}

export interface SSEImageStatusEvent {
  type: 'image_status'
  message: string
}

export interface SSEArtifactEvent {
  type: 'artifact'
  artifact: ArtifactData
}

export interface SSESourcesEvent {
  type: 'sources'
  sources: SourceLink[]
}

// ── Download ──

export interface ChatDownloadRequest {
  content: string
  format: 'docx'
  filename: string
}

// ── Client-side MessageState (UI rendering state) ──

export interface FileAttachment {
  name: string
  type: string
  size: number
  url?: string
}

export interface MessageState {
  type: 'right' | 'left'
  content: string
  tag: string
  cancelled: boolean
  agentTools: string[]
  agentReasoning: string
  imageStatus: string
  images: GeneratedImage[]
  slideStatus: string
  slideStages: Record<string, SlideStageEvent>
  slides: SlideDeck[]
  sources: SourceLink[]
  artifacts: ArtifactData[]
  isRagMessage: boolean
  assistantMessageId: number | null
  uuid: string
  file: FileAttachment | null
  dbId: number | null
  is_helpful?: boolean | null
}
