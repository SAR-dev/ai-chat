import { http, HttpResponse, delay } from 'msw'
import type { ChatMessage } from '@/types'
import * as db from './db'

const MOCK_LATENCY = Number(import.meta.env.VITE_MOCK_LATENCY_MS) || 600
const MOCK_ERROR_RATE = Number(import.meta.env.VITE_MOCK_ERROR_RATE) || 0

function maybeError() {
  if (Math.random() < MOCK_ERROR_RATE) {
    return HttpResponse.json({ error: 'Simulated server error' }, { status: 500 })
  }
  return null
}

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
  `Absolutely! Here's an artifact with some code:

\`\`\`artifact
{
  "id": "art-1",
  "type": "code",
  "language": "python",
  "title": "Quick Sort Implementation",
  "content": "def quick_sort(arr):\\n    if len(arr) <= 1:\\n        return arr\\n    pivot = arr[len(arr) // 2]\\n    left = [x for x in arr if x < pivot]\\n    middle = [x for x in arr if x == pivot]\\n    right = [x for x in arr if x > pivot]\\n    return quick_sort(left) + middle + quick_sort(right)\\n\\n# Example usage\\narr = [3, 6, 8, 10, 1, 2, 1]\\nprint(quick_sort(arr))"
}
\`\`\`

This is an efficient **divide-and-conquer** algorithm with $O(n \\log n)$ average time complexity.`,
]

function pickResponse(): string {
  return mockResponses[Math.floor(Math.random() * mockResponses.length)]
}

function extractArtifact(content: string) {
  const match = content.match(/```artifact\n([\s\S]*?)```/)
  if (!match) return null
  try {
    return JSON.parse(match[1])
  } catch {
    return null
  }
}

export const handlers = [
  // Auth
  http.post('/api/auth/login', async ({ request }) => {
    await delay(MOCK_LATENCY)
    const err = maybeError()
    if (err) return err

    const body = (await request.json()) as { email: string; password: string }
    const user = db.findUserByEmail(body.email)
    if (!user) {
      return HttpResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }
    const token = db.createToken(user.id)
    return HttpResponse.json({ token, user })
  }),

  http.post('/api/auth/logout', async ({ request }) => {
    await delay(MOCK_LATENCY / 2)
    const auth = request.headers.get('Authorization')
    if (auth?.startsWith('Bearer ')) {
      db.removeToken(auth.slice(7))
    }
    return HttpResponse.json({ ok: true })
  }),

  http.get('/api/auth/me', async ({ request }) => {
    await delay(MOCK_LATENCY / 2)
    const auth = request.headers.get('Authorization')
    if (!auth?.startsWith('Bearer ')) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = db.findUserByToken(auth.slice(7))
    if (!user) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return HttpResponse.json({ user })
  }),

  // Sessions
  http.get('/api/sessions', async () => {
    await delay(MOCK_LATENCY / 2)
    const sessions = db.getSessions()
    return HttpResponse.json(sessions)
  }),

  http.post('/api/sessions', async ({ request }) => {
    await delay(MOCK_LATENCY / 2)
    const body = (await request.json()) as { title?: string } | null
    const session = db.createSession(body?.title ?? 'New Chat')
    return HttpResponse.json(session, { status: 201 })
  }),

  http.patch('/api/sessions/:id', async ({ params, request }) => {
    await delay(MOCK_LATENCY / 2)
    const body = (await request.json()) as { title: string }
    const session = db.updateSession(params.id as string, { title: body.title })
    if (!session) {
      return HttpResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    return HttpResponse.json(session)
  }),

  http.delete('/api/sessions/:id', async ({ params }) => {
    await delay(MOCK_LATENCY / 2)
    const ok = db.deleteSession(params.id as string)
    if (!ok) {
      return HttpResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    return HttpResponse.json({ ok: true })
  }),

  // Messages
  http.get('/api/sessions/:id/messages', async ({ params }) => {
    await delay(MOCK_LATENCY / 2)
    const messages = db.getMessages(params.id as string)
    return HttpResponse.json(messages)
  }),

  http.post('/api/sessions/:id/messages', async ({ params, request }) => {
    await delay(MOCK_LATENCY)
    const body = (await request.json()) as { content: string; attachments?: string[] }
    const sessionId = params.id as string

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      sessionId,
      role: 'user',
      content: body.content,
      timestamp: new Date().toISOString(),
      attachments: body.attachments?.map((id) => ({
        id,
        filename: 'file.png',
        filetype: 'image/png',
        size: 1024,
        url: `/api/files/${id}`,
      })),
    }
    db.addMessage(userMessage)

    const responseContent = pickResponse()
    const artifact = extractArtifact(responseContent)

    const assistantMessage: ChatMessage = {
      id: `msg-${Date.now()}-assistant`,
      sessionId,
      role: 'assistant',
      content: responseContent,
      timestamp: new Date().toISOString(),
      artifacts: artifact ? [artifact] : undefined,
    }
    db.addMessage(assistantMessage)
    db.updateSession(sessionId, { title: body.content.slice(0, 50) })

    return HttpResponse.json(assistantMessage, { status: 201 })
  }),

  // Streaming
  http.post('/api/sessions/:id/messages/stream', async ({ params, request }) => {
    const sessionId = params.id as string
    const body = (await request.json()) as { content: string; attachments?: string[] }

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      sessionId,
      role: 'user',
      content: body.content,
      timestamp: new Date().toISOString(),
    }
    db.addMessage(userMessage)
    db.updateSession(sessionId, { title: body.content.slice(0, 50) })

    const fullContent = pickResponse()

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const words = fullContent.split(/(?<=\s)/)
        for (const word of words) {
          await delay(20)
          controller.enqueue(encoder.encode(word))
        }
        controller.close()
      },
    })

    const artifact = extractArtifact(fullContent)
    const assistantMessage: ChatMessage = {
      id: `msg-${Date.now()}-assistant`,
      sessionId,
      role: 'assistant',
      content: fullContent,
      timestamp: new Date().toISOString(),
      artifacts: artifact ? [artifact] : undefined,
    }
    db.addMessage(assistantMessage)

    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'text/plain',
        'X-Message-Id': assistantMessage.id,
      },
    })
  }),

  http.post('/api/messages/:id/regenerate', async ({ params }) => {
    await delay(MOCK_LATENCY)
    const oldMessage = db.getMessage(params.id as string)
    if (!oldMessage) {
      return HttpResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    const newContent = pickResponse()
    const artifact = extractArtifact(newContent)

    const assistantMessage: ChatMessage = {
      id: `msg-${Date.now()}-assistant`,
      sessionId: oldMessage.sessionId,
      role: 'assistant',
      content: newContent,
      timestamp: new Date().toISOString(),
      artifacts: artifact ? [artifact] : undefined,
    }
    db.addMessage(assistantMessage)
    return HttpResponse.json(assistantMessage)
  }),

  // Feedback
  http.post('/api/messages/:id/feedback', async ({ params, request }) => {
    await delay(MOCK_LATENCY / 2)
    const body = (await request.json()) as { rating: string; comment?: string }
    db.updateMessage(params.id as string, {
      feedback: { rating: body.rating as 'helpful' | 'not_helpful', comment: body.comment },
    })
    return HttpResponse.json({ ok: true })
  }),

  // Files
  http.post('/api/files', async ({ request }) => {
    await delay(MOCK_LATENCY)
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return HttpResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    const id = `file-${Date.now()}`
    return HttpResponse.json({
      id,
      filename: file.name,
      filetype: file.type,
      size: file.size,
      url: `/api/files/${id}`,
    })
  }),

  http.get('/api/files/:id', async ({ params }) => {
    await delay(MOCK_LATENCY / 2)
    return HttpResponse.json({
      id: params.id,
      filename: 'example.png',
      filetype: 'image/png',
      size: 1024,
      url: `/api/files/${params.id}`,
      content: null,
    })
  }),
]
