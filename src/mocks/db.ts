import type { User, ChatSession, ChatMessage, Category, ActiveRequest, ChatSessionSummary } from '@/types'

// Internal type for stored messages (includes sessionId which isn't in the public ChatMessage type)
interface StoredMessage extends ChatMessage {
  sessionId: string
}

interface MockDB {
  users: User[]
  sessions: ChatSession[]
  messages: StoredMessage[]
  tokens: Record<string, string>
  categories: Category[]
  activeRequests: ActiveRequest[]
  messageIdCounter: number
}

const now = new Date().toISOString()

const seedData: MockDB = {
  users: [
    {
      id: 1,
      username: 'demo',
      email: 'demo@example.com',
      display_name: 'Demo User',
      is_verified: true,
      agent_enabled: false,
    },
  ],
  sessions: [
    {
      id: 'session-1',
      title: 'Welcome to KikuChat',
      category: 'normalChat',
    },
  ],
  messages: [
    {
      id: 1,
      sessionId: 'session-1',
      role: 'assistant',
      content: `Hello! Welcome to **KikuChat**, powered by **Kikuma v-1.0.0**. I'm your AI assistant. Here are some things I can help you with:

- Answer questions and explain concepts
- Write and debug **code** in various languages
- Create **tables**, **lists**, and formatted documents
- Render **mathematical expressions** like $E = mc^2$
- Generate **diagrams** using Mermaid

Try asking me something!`,
      created_at: now,
    },
  ],
  tokens: {},
  categories: [
    { name: 'normalChat' },
    { name: 'company_kb' },
    { name: 'technical_docs' },
    { name: 'product_manual' },
  ],
  activeRequests: [],
  messageIdCounter: 100,
}

function loadDB(): MockDB {
  try {
    const stored = localStorage.getItem('mock-db')
    if (stored) return JSON.parse(stored) as MockDB
  } catch {
    // ignore
  }
  return structuredClone(seedData)
}

function saveDB(db: MockDB): void {
  try {
    localStorage.setItem('mock-db', JSON.stringify(db))
  } catch {
    // ignore
  }
}

let db = loadDB()

export function getDB(): MockDB {
  return db
}

export function resetDB(): void {
  db = structuredClone(seedData)
  saveDB(db)
}

export function persistDB(): void {
  saveDB(db)
}

// ── Users ──

export function findUserByUsername(username: string): User | undefined {
  return db.users.find((u) => u.username === username)
}

export function findUserByEmail(email: string): User | undefined {
  return db.users.find((u) => u.email === email)
}

export function findUserByToken(token: string): User | undefined {
  const userId = db.tokens[token]
  if (!userId) return undefined
  return db.users.find((u) => u.id === Number(userId))
}

export function createUser(data: { username: string; password: string; email: string }): User {
  const id = db.users.length + 1
  const user: User = {
    id,
    username: data.username,
    email: data.email,
    display_name: data.username,
    is_verified: true,
    agent_enabled: false,
  }
  db.users.push(user)
  mockPasswords[id] = data.password
  persistDB()
  return user
}

const mockPasswords: Record<number, string> = {
  1: 'demo1234',
}

export function verifyPassword(userId: number, password: string): boolean {
  return mockPasswords[userId] === password
}

export function createToken(userId: number): string {
  const token = `mock-token-${userId}-${Date.now()}`
  db.tokens[token] = String(userId)
  persistDB()
  return token
}

export function removeToken(token: string): void {
  delete db.tokens[token]
  persistDB()
}

// ── Sessions ──

export function getSessions(limit?: number, offset?: number): { sessions: ChatSessionSummary[]; count: number } {
  const all = [...db.sessions]
    .sort((a, b) => {
      const aMsg = getLastMessage(a.id)
      const bMsg = getLastMessage(b.id)
      const aTime = aMsg ? new Date(aMsg.created_at).getTime() : 0
      const bTime = bMsg ? new Date(bMsg.created_at).getTime() : 0
      return bTime - aTime
    })
  const count = all.length
  const start = offset ?? 0
  const end = limit ? start + limit : undefined
  const paged = all.slice(start, end)
  return {
    sessions: paged.map((s) => ({ id: s.id, title: s.title })),
    count,
  }
}

function getLastMessage(sessionId: string): StoredMessage | undefined {
  const msgs = db.messages.filter((m) => m.sessionId === sessionId)
  return msgs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
}

export function getSession(id: string): ChatSession | undefined {
  return db.sessions.find((s) => s.id === id)
}

export function createSession(title: string, category?: string): ChatSession {
  const session: ChatSession = {
    id: `session-${Date.now()}`,
    title,
    category: category ?? 'normalChat',
  }
  db.sessions.push(session)
  persistDB()
  return session
}

export function updateSession(id: string, updates: Partial<ChatSession>): ChatSession | undefined {
  const session = db.sessions.find((s) => s.id === id)
  if (!session) return undefined
  Object.assign(session, updates)
  persistDB()
  return session
}

export function deleteSession(id: string): boolean {
  const index = db.sessions.findIndex((s) => s.id === id)
  if (index === -1) return false
  db.sessions.splice(index, 1)
  db.messages = db.messages.filter((m) => m.sessionId !== id)
  persistDB()
  return true
}

// ── Messages ──

export function getMessages(sessionId: string): ChatMessage[] {
  return db.messages
    .filter((m) => m.sessionId === sessionId)
    .sort((a, b) => {
      const aTime = new Date(a.created_at).getTime()
      const bTime = new Date(b.created_at).getTime()
      if (aTime !== bTime) return aTime - bTime
      return a.id - b.id
    })
}

export function addMessage(message: StoredMessage): StoredMessage {
  const msg = { ...message, id: db.messageIdCounter++ }
  db.messages.push(msg)
  persistDB()
  return msg
}

export function getMessage(id: number): StoredMessage | undefined {
  return db.messages.find((m) => m.id === id)
}

export function updateMessage(id: number, updates: Partial<ChatMessage>): ChatMessage | undefined {
  const message = db.messages.find((m) => m.id === id)
  if (!message) return undefined
  Object.assign(message, updates)
  persistDB()
  return message
}

export function getNextMessageId(): number {
  return db.messageIdCounter++
}

export function truncateMessages(sessionId: string, fromMessageId: number): number {
  const msgs = db.messages.filter((m) => m.sessionId === sessionId)
  const deleteFrom = msgs.findIndex((m) => m.id === fromMessageId)
  if (deleteFrom === -1) return 0
  const toDelete = msgs.slice(deleteFrom)
  const idsToDelete = new Set(toDelete.map((m) => m.id))
  db.messages = db.messages.filter((m) => !idsToDelete.has(m.id))
  persistDB()
  return toDelete.length
}

// ── Categories ──

export function getCategories(): Category[] {
  return [...db.categories]
}

// ── Active Requests ──

export function addActiveRequest(requestId: string): void {
  db.activeRequests.push({
    request_id: requestId,
    status: 'active',
    created_at: new Date().toISOString(),
  })
  persistDB()
}

export function removeActiveRequest(requestId: string): void {
  db.activeRequests = db.activeRequests.filter((r) => r.request_id !== requestId)
  persistDB()
}

export function cancelRequest(requestId: string): ActiveRequest | undefined {
  const req = db.activeRequests.find((r) => r.request_id === requestId)
  if (req) {
    req.status = 'cancelled'
    persistDB()
  }
  return req
}

export function getActiveRequests(): ActiveRequest[] {
  return [...db.activeRequests]
}
