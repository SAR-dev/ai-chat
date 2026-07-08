import { http, HttpResponse, delay } from 'msw'
import type { User } from '@/types'
import * as db from './db'

const MOCK_LATENCY = Number(import.meta.env.VITE_MOCK_LATENCY_MS) || 600
const MOCK_ERROR_RATE = Number(import.meta.env.VITE_MOCK_ERROR_RATE) || 0

function maybeError() {
  if (Math.random() < MOCK_ERROR_RATE) {
    return HttpResponse.json({ error: 'Simulated server error' }, { status: 500 })
  }
  return null
}

function requireAuth(request: Request): User | null {
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  return db.findUserByToken(auth.slice(7)) ?? null
}

// ── Mock response content pool ──

const mockResponses = [
  `That's a great question! Here's what I think:

The key concept here involves **several important factors** to consider.

1. First, you need to understand the **fundamentals**
2. Then, apply them to your specific use case
3. Finally, iterate and refine your approach

Here's a simple example:

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}! Welcome to KikuChat.\`;
}

console.log(greet("User"));
\`\`\`

I hope this helps! Let me know if you'd like me to elaborate on any part.`,
  `Here's a **markdown table** showing the comparison:

| Feature | Free Plan | Pro Plan | Enterprise |
|---------|-----------|----------|------------|
| Messages | 100/day | Unlimited | Unlimited |
| File Upload | 5MB | 50MB | 500MB |
| Support | Community | Priority | 24/7 Dedicated |
| Price | $0 | $20/mo | Custom |

Let me know which plan interests you!

Also, here's a mathematical expression: The quadratic formula is $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$.

And a block expression:

$$\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}$$`,
  `Here's a **Mermaid diagram** illustrating the architecture:

\`\`\`mermaid
flowchart TD
    A[Client] --> B[API Gateway]
    B --> C[Auth Service]
    B --> D[Chat Service]
    B --> E[File Service]
    C --> F[(User DB)]
    D --> G[(Messages DB)]
    E --> H[(File Storage)]
    style A fill:#2F6FEB,color:#fff
    style B fill:#4F86F7,color:#fff
    style C fill:#E5484D,color:#fff
    style D fill:#E5484D,color:#fff
    style E fill:#E5484D,color:#fff
\`\`\`

This architecture ensures **scalability** and **separation of concerns**.`,
  `Here's a quick analysis of the data:

\`\`\`artifact
{
  "type": "chart",
  "chart_type": "bar",
  "title": "Monthly Revenue",
  "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
  "datasets": [
    { "label": "2024", "data": [120, 145, 160, 155, 180, 210] },
    { "label": "2025", "data": [200, 220, 240, 235, 260, 290] }
  ]
}
\`\`\`

The chart above shows the revenue trend over the first half of each year. Revenue has grown consistently year-over-year.`,
]

function pickResponse(): string {
  return mockResponses[Math.floor(Math.random() * mockResponses.length)]
}

function extractArtifactBlocks(content: string) {
  const blocks: { type: string; data: Record<string, unknown> }[] = []
  const regex = /```artifact\n([\s\S]*?)```/g
  let match
  while ((match = regex.exec(content)) !== null) {
    try {
      blocks.push({ type: 'artifact', data: JSON.parse(match[1]) })
    } catch {
      // skip invalid artifact blocks
    }
  }
  return blocks
}

function stripArtifactBlocks(content: string): string {
  return content.replace(/```artifact\n[\s\S]*?```/g, '').trim()
}

// ── SSE helpers ──

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

function sseData(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

// Helper to create SSE ReadableStream
function createSSEStream(
  content: string,
  sessionId: string,
  assistantMessageId: number,
  extraEvents: string[] = [],
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const artifactBlocks = extractArtifactBlocks(content)
  const cleanContent = stripArtifactBlocks(content)

  return new ReadableStream({
    async start(controller) {
      // 1. Agent tools event
      controller.enqueue(
        encoder.encode(
          sseEvent('agent_tools', {
            tools: ['rag_search', 'web_search'],
            reasoning: 'Analyzing the query and gathering relevant information...',
          }),
        ),
      )

      // 2. Title update
      controller.enqueue(
        encoder.encode(
          sseEvent('title_updated', {
            session_title: content.slice(0, 40).trim() + '...',
            session_id: sessionId,
          }),
        ),
      )

      // 3. Text tokens (using `reply` field for default chat)
      const cleanWords = cleanContent.split(/(?<=\s)/)
      for (const word of cleanWords) {
        await delay(25)
        controller.enqueue(encoder.encode(sseData({ reply: word })))
      }

      // 4. Extra events (e.g. artifacts)
      for (const event of extraEvents) {
        controller.enqueue(encoder.encode(event))
      }

      // 5. Artifact blocks
      for (const block of artifactBlocks) {
        await delay(50)
        controller.enqueue(
          encoder.encode(
            sseData({ type: 'artifact', artifact: block.data }),
          ),
        )
      }

      // 6. Done event
      controller.enqueue(
        encoder.encode(
          sseData({ type: 'done', assistant_message_id: assistantMessageId }),
        ),
      )

      controller.close()
    },
  })
}

export const handlers = [
  // ── Auth ──

  http.post('/api/login', async ({ request }) => {
    await delay(MOCK_LATENCY)
    const err = maybeError()
    if (err) return err

    const body = (await request.json()) as { username: string; password: string }
    const user = db.findUserByUsername(body.username)
    if (!user || !db.verifyPassword(user.id, body.password)) {
      return HttpResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 },
      )
    }
    const token = db.createToken(user.id)
    return HttpResponse.json({
      message: 'Login successful',
      recent_sessions: [],
      token,
      user,
    })
  }),

  http.post('/api/login/ad', async ({ request }) => {
    await delay(MOCK_LATENCY)
    const err = maybeError()
    if (err) return err

    const body = (await request.json()) as { username: string; password: string }
    // Strip domain prefix for AD lookup
    const cleanUsername = body.username.includes('\\') ? body.username.split('\\')[1] : body.username
    const user = db.findUserByUsername(cleanUsername)
    if (!user || !db.verifyPassword(user.id, body.password)) {
      return HttpResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 },
      )
    }
    const token = db.createToken(user.id)
    return HttpResponse.json({
      auth_method: 'ad',
      message: 'AD Login successful',
      recent_sessions: [],
      token,
      user,
    })
  }),

  http.post('/api/register', async ({ request }) => {
    await delay(MOCK_LATENCY)
    const err = maybeError()
    if (err) return err

    const body = (await request.json()) as { username: string; password: string; email: string }

    if (db.findUserByUsername(body.username)) {
      return HttpResponse.json({ error: 'Username already taken' }, { status: 409 })
    }
    if (db.findUserByEmail(body.email)) {
      return HttpResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    const user = db.createUser(body)
    return HttpResponse.json({
      email: user.email,
      message: 'Registration successful',
      user_id: String(user.id),
      username: user.username,
      verification_required: false,
      verification_token: 'mock-verification-token',
    })
  }),

  // ── Chat Stream (Default LLM) ──

  http.post('/api/chat/stream', async ({ request }) => {
    const user = requireAuth(request)
    if (!user) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as {
      message: string
      session_id?: string
      mode?: string
      internet_search?: boolean
      slide_mode?: string
      agent_mode?: boolean
    }

    let sessionId = body.session_id
    if (!sessionId) {
      const session = db.createSession(body.message.slice(0, 50))
      sessionId = session.id
    }

    // Store user message
    db.addMessage({
      sessionId,
      id: 0,
      content: body.message,
      role: 'user',
      created_at: new Date().toISOString(),
    })

    // Update session title
    db.updateSession(sessionId, { title: body.message.slice(0, 50) })

    const fullContent = pickResponse()
    const assistantMsg = db.addMessage({
      sessionId,
      id: 0,
      content: fullContent,
      role: 'assistant',
      created_at: new Date().toISOString(),
    })

    const stream = createSSEStream(fullContent, sessionId, assistantMsg.id)

    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Session-Id': sessionId,
      },
    })
  }),

  // ── RAG Chat Stream ──

  http.post('/api/query/stream', async ({ request }) => {
    const user = requireAuth(request)
    if (!user) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as {
      query: string
      show_context?: boolean
      top_k: string
      session_id?: string
      category: string
      mode?: string
      internet_search?: boolean
      agent_mode?: boolean
    }

    let sessionId = body.session_id
    if (!sessionId) {
      const session = db.createSession(body.query.slice(0, 50), body.category)
      sessionId = session.id
    }

    db.addMessage({
      sessionId,
      id: 0,
      content: body.query,
      role: 'user',
      created_at: new Date().toISOString(),
    })

    db.updateSession(sessionId, { title: body.query.slice(0, 50), category: body.category })

    const fullContent = pickResponse()
    const assistantMsg = db.addMessage({
      sessionId,
      id: 0,
      content: fullContent,
      role: 'assistant',
      created_at: new Date().toISOString(),
      sources: [
        { index: 1, title: 'Internal Knowledge Base', url: '#' },
        { index: 2, title: 'Technical Documentation v2.1', url: '#' },
      ],
    })

    const encoder = new TextEncoder()
    const cleanContent = stripArtifactBlocks(fullContent)
    const cleanWords = cleanContent.split(/(?<=\s)/)

    const stream = new ReadableStream({
      async start(controller) {
        // Text tokens use `answer` field for RAG
        for (const word of cleanWords) {
          await delay(25)
          controller.enqueue(encoder.encode(sseData({ answer: word })))
        }

        // Sources
        await delay(30)
        controller.enqueue(
          encoder.encode(
            sseData({
              type: 'sources',
              sources: [
                { index: 1, title: 'Internal Knowledge Base', url: '#' },
                { index: 2, title: 'Technical Documentation v2.1', url: '#' },
              ],
            }),
          ),
        )

        // Done
        controller.enqueue(
          encoder.encode(
            sseData({ type: 'done', assistant_message_id: assistantMsg.id }),
          ),
        )

        controller.close()
      },
    })

    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Session-Id': sessionId,
      },
    })
  }),

  // ── Chat Download ──

  http.post('/api/chat/download', async () => {
    await delay(MOCK_LATENCY / 2)
    // Return a mock DOCX binary
    const mockDocx = new Uint8Array([0x50, 0x4b, 0x03, 0x04])
    return new HttpResponse(mockDocx, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="chat-export.docx"',
      },
    })
  }),

  // ── Sessions ──

  http.get('/api/sessions', async ({ request }) => {
    const user = requireAuth(request)
    if (!user) return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await delay(MOCK_LATENCY / 2)
    const url = new URL(request.url)
    const limit = url.searchParams.get('limit')
    const offset = url.searchParams.get('offset')

    const result = db.getSessions(limit ? Number(limit) : undefined, offset ? Number(offset) : undefined)
    return HttpResponse.json(result)
  }),

  http.get('/api/sessions/:sessionId', async ({ params, request }) => {
    const user = requireAuth(request)
    if (!user) return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await delay(MOCK_LATENCY / 2)
    const session = db.getSession(params.sessionId as string)
    if (!session) {
      return HttpResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const messages = db.getMessages(params.sessionId as string)
    return HttpResponse.json({ session, messages })
  }),

  http.delete('/api/sessions/:sessionId', async ({ params, request }) => {
    const user = requireAuth(request)
    if (!user) return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await delay(MOCK_LATENCY / 2)
    const ok = db.deleteSession(params.sessionId as string)
    if (!ok) {
      return HttpResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    return HttpResponse.json({ message: 'Session deleted' })
  }),

  http.post('/api/sessions/:sessionId/messages/truncate', async ({ params, request }) => {
    const user = requireAuth(request)
    if (!user) return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await delay(MOCK_LATENCY / 2)
    const body = (await request.json()) as { from_message_id: number }
    const deleted = db.truncateMessages(params.sessionId as string, body.from_message_id)
    return HttpResponse.json({ deleted })
  }),

  // ── Feedback ──

  http.post('/api/messages/:messageId/feedback', async ({ params, request }) => {
    const user = requireAuth(request)
    if (!user) return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await delay(MOCK_LATENCY / 2)
    const body = (await request.json()) as { is_helpful: boolean | null }
    const msgId = Number(params.messageId)
    db.updateMessage(msgId, { is_helpful: body.is_helpful })

    return HttpResponse.json({
      message: 'Feedback submitted',
      message_id: msgId,
      is_helpful: body.is_helpful,
      cache_invalidated: true,
    })
  }),

  // ── Categories ──

  http.get('/api/categories', async ({ request }) => {
    const user = requireAuth(request)
    if (!user) return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await delay(MOCK_LATENCY / 2)
    return HttpResponse.json(db.getCategories())
  }),

  // ── User Settings ──

  http.get('/api/user/settings', async ({ request }) => {
    const user = requireAuth(request)
    if (!user) return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await delay(MOCK_LATENCY / 2)
    return HttpResponse.json({ agent_enabled: user.agent_enabled ?? false })
  }),

  http.patch('/api/user/settings', async ({ request }) => {
    const user = requireAuth(request)
    if (!user) return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await delay(MOCK_LATENCY / 2)
    const body = (await request.json()) as { agent_enabled: boolean }
    user.agent_enabled = body.agent_enabled
    db.persistDB()

    return HttpResponse.json({ agent_enabled: user.agent_enabled })
  }),

  // ── Slides ──

  http.post('/api/slides/:deckId/:slideId/regenerate', async ({ request }) => {
    const user = requireAuth(request)
    if (!user) return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await delay(MOCK_LATENCY)
    const body = (await request.json()) as { instruction: string }

    return HttpResponse.json({
      deck_id: 'deck-1',
      slide_id: 2,
      html_fragment: '<section><h2>Regenerated Slide</h2><p>Content based on: ' + body.instruction + '</p></section>',
      pptx_url: '/api/files/mock-presentation.pptx',
    })
  }),

  // ── Request Management ──

  http.post('/api/request/cancel/:requestId', async ({ params }) => {
    const req = db.cancelRequest(params.requestId as string)
    return HttpResponse.json({
      message: req ? 'Request cancelled' : 'Request not found',
      request_id: params.requestId,
      status: req?.status ?? 'unknown',
    })
  }),

  http.get('/api/request/active', async () => {
    return HttpResponse.json({
      active_requests: db.getActiveRequests(),
      count: db.getActiveRequests().length,
    })
  }),
]
