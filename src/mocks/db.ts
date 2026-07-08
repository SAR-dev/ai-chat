import type { User, ChatSession, ChatMessage } from '@/types'

interface MockDB {
  users: User[]
  sessions: ChatSession[]
  messages: ChatMessage[]
  tokens: Record<string, string>
}

const now = new Date().toISOString()

const seedData: MockDB = {
  users: [{ id: 'user-1', email: 'demo@example.com', name: 'Demo User', employeeId: String(Math.floor(1000 + Math.random() * 9000)) }],
  sessions: [
    {
      id: 'session-1',
      title: 'Welcome to KikuChat',
      createdAt: now,
      updatedAt: now,
    },
  ],
  messages: [
    {
      id: 'msg-1',
      sessionId: 'session-1',
      role: 'assistant',
      content: `Hello! Welcome to **KikuChat**, powered by **Kikuma v-1.0.0**. I'm your AI assistant. Here are some things I can help you with:

- Answer questions and explain concepts
- Write and debug **code** in various languages
- Create **tables**, **lists**, and formatted documents
- Render **mathematical expressions** like $E = mc^2$
- Generate **diagrams** using Mermaid

Try asking me something!`,
      timestamp: now,
    },
  ],
  tokens: {},
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

export function findUserByEmail(email: string): User | undefined {
  return db.users.find((u) => u.email === email)
}

export function findUserByToken(token: string): User | undefined {
  const userId = db.tokens[token]
  if (!userId) return undefined
  return db.users.find((u) => u.id === userId)
}

export function createToken(userId: string): string {
  const token = `mock-token-${userId}-${Date.now()}`
  db.tokens[token] = userId
  persistDB()
  return token
}

export function removeToken(token: string): void {
  delete db.tokens[token]
  persistDB()
}

export function getSessions(): ChatSession[] {
  return [...db.sessions].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}

export function getSession(id: string): ChatSession | undefined {
  return db.sessions.find((s) => s.id === id)
}

export function createSession(title: string): ChatSession {
  const session: ChatSession = {
    id: `session-${Date.now()}`,
    title,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  db.sessions.push(session)
  persistDB()
  return session
}

export function updateSession(id: string, updates: Partial<ChatSession>): ChatSession | undefined {
  const session = db.sessions.find((s) => s.id === id)
  if (!session) return undefined
  Object.assign(session, updates, { updatedAt: new Date().toISOString() })
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

export function getMessages(sessionId: string): ChatMessage[] {
  return db.messages
    .filter((m) => m.sessionId === sessionId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
}

export function addMessage(message: ChatMessage): ChatMessage {
  db.messages.push(message)
  persistDB()
  return message
}

export function getMessage(id: string): ChatMessage | undefined {
  return db.messages.find((m) => m.id === id)
}

export function updateMessage(id: string, updates: Partial<ChatMessage>): ChatMessage | undefined {
  const message = db.messages.find((m) => m.id === id)
  if (!message) return undefined
  Object.assign(message, updates)
  persistDB()
  return message
}

export function deleteMessagesAfter(sessionId: string, afterId: string): void {
  const afterIndex = db.messages.findIndex((m) => m.sessionId === sessionId && m.id === afterId)
  if (afterIndex === -1) return
  db.messages = db.messages.filter(
    (m) => !(m.sessionId === sessionId && db.messages.indexOf(m) > afterIndex),
  )
  persistDB()
}
