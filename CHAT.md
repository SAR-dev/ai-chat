# Chat API & Rendering Pattern Reference

This document describes the chat API endpoints, streaming protocol, message data model, and UI rendering patterns used in this project. Use it as a reference when building a similar chat interface in a separate project.

---

## API Base URL

| Environment | URL |
|---|---|
| Development (mock/dev server) | `/api/` (proxied by CRA dev server) |
| Development (direct backend) | `http://192.168.25.219:81/api/` |
| Staging | `http://192.168.2.219:30083/api/` |
| Production | `https://api.production.com/api/` |

The app resolves the base URL in this priority:

1. `REACT_APP_BACKEND_API_URL` — direct backend URL (bypasses any proxy/mock)
2. `REACT_APP_API_BASE_URL` — proxy path (e.g. `/api/` for CRA dev server)
3. Hardcoded fallback per `REACT_APP_ENV`

Set `REACT_APP_BACKEND_API_URL=http://192.168.25.219:81` in `.env.development` to connect directly to the real backend instead of the dev server proxy.

---

## API Endpoints

### Authentication

| Method | Endpoint | Description | Transport |
|---|---|---|---|
| POST | `/login` | User login | axios |
| POST | `/register` | User registration | axios |

### Chat Sessions

| Method | Endpoint | Description | Transport |
|---|---|---|---|
| GET | `/sessions?limit={n}&offset={n}` | List user's chat sessions | axios |
| GET | `/sessions/{sessionId}` | Get session details + messages | axios |
| DELETE | `/sessions/{sessionId}` | Delete a session | axios |
| POST | `/sessions/{sessionId}/messages/truncate` | Delete messages from a given ID onward (edit & resend) | axios |

### Streaming Chat

| Method | Endpoint | Description | Transport |
|---|---|---|---|
| POST | `/chat/stream` | Default chat (non-RAG) | fetch (SSE) |
| POST | `/query/stream` | RAG chat (with source retrieval) | fetch (SSE) |

### Other

| Method | Endpoint | Description | Transport |
|---|---|---|---|
| POST | `/messages/{messageId}/feedback` | Submit thumbs up/down | axios |
| GET | `/categories` | List RAG categories | axios |
| POST | `/slides/{deckId}/{slideId}/regenerate` | Regenerate one slide | axios |
| GET | `/request/active` | List active server-side requests | axios |
| POST | `/request/cancel/{requestId}` | Cancel an active request | axios |
| POST | `/chat/download` | Download message as DOCX | fetch |

---

## Authentication

Every request includes:

- **Header**: `Authorization: Bearer {token}`
- **Header**: `x-session-id: {sessionId}`
- **Credentials**: `include` for cookies

Token and session ID are read from Redux store on each request.

---

## SSE Streaming Protocol (Chat)

Both `/chat/stream` (default chat) and `/query/stream` (RAG chat) use SSE (Server-Sent Events) over `fetch()` with `ReadableStream`.

### Request (Default Chat)

```json
{
  "message": "string",
  "session_id": "string (optional)",
  "mode": "fast | thinking (optional)",
  "internet_search": true | false (optional),
  "slide_mode": "standard | creative (optional)",
  "agent_mode": true | false (optional)
}
```

With file attachment: `multipart/form-data` via `FormData` with the same fields + a `file` field.

### Request (RAG Chat)

```json
{
  "query": "string",
  "category": "string (category name, or 'normalChat' for non-RAG)",
  "top_k": "string (e.g. '5')",
  "session_id": "string (optional)",
  "mode": "fast | thinking (optional)",
  "internet_search": true | false (optional),
  "agent_mode": true | false (optional)
}
```

### SSE Event Format

```
event: {eventType}\n
data: {jsonPayload}\n\n
```

### Named Events

#### `event: title_updated`
```json
{
  "session_id": "string",
  "session_title": "string",
  "title": "string"
}
```
→ Fires `onMeta({ session_id, session_title })`

#### `event: agent_tools`
```json
{
  "tools": ["string"],
  "reasoning": "string"
}
```
→ Fires `onAgentTools({ tools, reasoning })`

### Unnamed data lines (parsed by `parseStreamData`)

Every data line is JSON-parsed and inspected for these fields:

| JSON Shape | Handler | Description |
|---|---|---|
| `{"type":"token","content":"..."}` | `onChunk(content)` | Incremental text token |
| `{"full_text":"..."}` | `onChunk(delta)` | Cumulative full text (emits the delta from previous) |
| `{"content":"..."}` | `onChunk(content)` | Plain content (no type) |
| `{"chunk":"..."}` | `onChunk(chunk)` | Raw chunk |
| `{"delta":"..."}` | `onChunk(delta)` | Delta chunk |
| `{"reply":"..."}` | `onChunk(delta)` | Reply field (cumulative or incremental) |
| `{"answer":"..."}` | `onChunk(delta)` | Answer field (RAG, cumulative or incremental) |
| `{"type":"artifact","artifact":{...}}` | `onArtifact(normalized)` | Chart/KPI/table artifact |
| `{"type":"image","image":{...}}` | `onImage(normalized)` | FLUX-generated image |
| `{"type":"image_status","message":"..."}` | `onImageStatus(message)` | Image generation progress |
| `{"type":"slide","slide":{...}}` | `onSlide(normalized)` | Completed slide deck |
| `{"type":"slide_status","message":"..."}` | `onSlideStatus(message)` | Slide generation progress |
| `{"type":"slide_status","stage":"...","stage_status":"...","message":"..."}` | `onSlideStage(event)` | Per-stage pipeline progress |
| `{"type":"sources","sources":[...]}` | `onSources(sources)` | RAG reference sources |
| `{"type":"done","assistant_message_id":42}` | `onDone()` | Stream complete |
| `{"session_id":"...","session_title":"...","request_id":"..."}` | `onMeta(meta)` | Session metadata |

### Callback Interface

```typescript
{
  onChunk?: (chunk: string) => void;
  onDone?: () => void;
  onAgentTools?: (payload: { tools: string[]; reasoning?: string }) => void;
  onArtifact?: (artifact: ArtifactData) => void;
  onImage?: (image: GeneratedImage) => void;
  onImageStatus?: (status: string) => void;
  onSlide?: (deck: SlideDeck) => void;
  onSlideStatus?: (status: string) => void;
  onSlideStage?: (stage: SlideStageEvent) => void;
  onMeta?: (meta: {
    session_id?: string;
    session_title?: string;
    request_id?: string;
    assistant_message_id?: number;
  }) => void;
  onSources?: (sources: Array<{
    index: number; title: string; url: string; date?: string
  }>) => void;
  signal?: AbortSignal;  // AbortController.signal for cancellation
}
```

### Stream Reader Loop (core pattern)

```typescript
const response = await fetch(url, { method: "POST", headers, body, signal });
const reader = response.body.getReader();
const decoder = new TextDecoder("utf-8");
let buffer = "";
let currentEventType = "";

while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split(/\r?\n/);
  buffer = lines.pop() ?? "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("event:")) {
      currentEventType = trimmed.slice(6).trim();
      continue;
    }
    if (!trimmed.startsWith("data:")) continue;
    const data = trimmed.slice(5).trim();
    if (!data || data === "[DONE]") { currentEventType = ""; continue; }
    // Handle currentEventType + parsed JSON data
  }
}
```

### Client-Side Chunk Buffering

To avoid excessive React re-renders, incoming chunks are buffered and flushed periodically:

```typescript
const streamBufferRef = useRef("");
const flushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const scheduleStreamFlush = () => {
  if (flushTimeoutRef.current) return;
  flushTimeoutRef.current = setTimeout(() => {
    flushTimeoutRef.current = null;
    // append buffered content to the assistant message in state
  }, 70); // flush every 70ms
};
```

### Error Handling

On non-OK response:
```typescript
if (!response.ok) {
  let errorMessage = `Stream failed: ${response.status}`;
  try {
    const bodyText = await response.text();
    const match = bodyText.match(/data:\s*({.*})/);
    if (match) {
      const parsed = JSON.parse(match[1]);
      if (parsed.error) errorMessage = parsed.error;
    }
  } catch {}
  const err = new Error(errorMessage);
  (err as any).isApiError = true;
  throw err;
}
```

### Cancellation

Use `AbortController`:
```typescript
const abortControllerRef = useRef<AbortController | null>(null);

// Start
abortControllerRef.current = new AbortController();
fetch(url, { signal: abortControllerRef.current.signal });

// Cancel
abortControllerRef.current?.abort();
// Also fire-and-forget POST to /request/cancel/{requestId}
```

---

## Message Data Model (`MessageState`)

```typescript
interface MessageState {
  type: "right" | "left";              // user vs assistant
  content: string;                      // markdown text
  tag: string;                          // RAG category tag
  uuid?: string;                        // client-generated unique ID
  file?: { name: string; size: number; type: string; url?: string; localPreview?: string };
  cancelled?: boolean;                  // was streaming cancelled
  agentTools?: string[];                // tools used by agent
  agentReasoning?: string;              // agent chain-of-thought
  assistantMessageId?: number;          // DB id (for feedback)
  dbId?: number;                        // DB row id (for edit truncation)
  isHelpful?: boolean | null;           // thumbs up/down state
  isRagMessage?: boolean;
  sources?: SourceLink[];               // cited sources
  artifacts?: ArtifactData[];           // charts, KPI cards, tables
  images?: GeneratedImage[];            // FLUX-generated images
  imageStatus?: string;                 // transient image progress
  slides?: SlideDeck[];                 // presentation decks
  slideStatus?: string;                 // transient slide progress
  slideStages?: Partial<Record<SlideStageId, SlideStageEvent>>;
}
```

---

## Content Rendering Pipeline

When displaying an assistant message, content goes through this pipeline:

```
raw content
  → stripReferenceLinks()    // removes LLM-written reference footer section
  → applyCitationLinks()     // rewrites 【N】/【[N]】/記事[N] as markdown links
  → sanitizeMathContent()    // fixes math delimiters (\[ \] → $$ $$, removes bold inside math)
  → renumberSources()        // renumbers citation markers sequentially for display
  → MarkDownPreviewer(content, isStreaming)
      → react-markdown with plugins
```

### `applyCitationLinks()` — Source link patterns

From `src/utils/sourceLinks.ts`:

| Raw Pattern | Transformed To |
|---|---|
| `記事[N]「quoted title」` | `[quoted title](url)` |
| `記事[N]` | `[source title](url)` |
| `【[N]】` | `[source title](url)` |
| `【N】` | `[source title](url)` |
| `Source Title: https://url` | `[Source Title](url)` |
| bare URL | `[title](url)` |

---

## Markdown Rendering

Uses `react-markdown` with these plugins (in order):

| Plugin | Purpose |
|---|---|
| `remarkGfm` | Tables, strikethrough, task lists, auto-links |
| `remarkMath` | LaTeX math detection |
| `remarkEmoji` | Emoji shortcodes (`:smile:`) |
| `rehypeHighlight` | Syntax highlighting (highlight.js, github-dark theme) |
| `rehypeKatex` | KaTeX math rendering |

### Custom Renderers

| Element | Component | Notes |
|---|---|---|
| `pre` | `preRenderer` | Detects language and delegates |
| `code` with language `mermaid` | `MermaidBlock` | Live diagram with PNG download toggle |
| `code` with language `plantuml` | `PlantUMLBlock` | Rendered via plantuml.com, PNG download |
| `code` with language `html` | `HTMLPreviewBlock` | Sandboxed iframe + code/preview tabs |
| `code` (other languages) | `PreWithCopy` | Line numbers, copy/download buttons |
| `table` | `TableWrapper` | Horizontal scroll wrapper |

### Code Block Features (`PreWithCopy`)

- Language label header
- Line numbers (for multi-line blocks)
- Copy to clipboard button
- Download as file button (CSV/TSV/JSON/XML/SQL/YAML/Markdown/Text; XLSX option for CSV/TSV)

---

## Special Content Types

### Artifacts (`ArtifactData`)

```typescript
type ChartType = "line" | "bar" | "pie" | "area" | "scatter" | "forecast" | "heatmap" | "kpi_card" | "table";

interface ArtifactData {
  artifact_type: "chart" | "kpi_card" | "table";
  chart_type?: ChartType;
  title: string;
  subtitle?: string;
  data?: Array<{ name: string; [key: string]: string | number }>;
  series?: Array<{ key: string; label: string; color?: string; type?: string }>;
  kpis?: Array<{ label: string; value: string; unit?: string; change?: string; trend?: "up" | "down" | "neutral" }>;
  config?: { /* axis labels, currency, colors, scale type, etc. */ };
}
```

Artifacts are inserted into the message content at `⟦ARTIFACT:N⟧` placeholders. Renderer: `ArtifactRenderer.tsx` using Recharts (line, bar, pie, area, scatter, forecast with dashed projection, heatmap SVG grid).

### Generated Images (`GeneratedImage`)

```typescript
interface GeneratedImage {
  b64: string;          // data:image/png;base64,...
  prompt?: string;      // FLUX prompt
  caption?: string;     // Japanese caption
  width?: number;
  height?: number;
}
```

Rendered as styled cards by `GeneratedImageView.tsx`. Images are persisted client-side in IndexedDB keyed by `sessionId + assistantMessageId` (since the server only stores captions, not the binary data).

### Slide Decks (`SlideDeck`)

```typescript
interface SlideDeck {
  html: string;           // Self-contained HTML preview
  title: string;
  slideCount: number;
  pptxUrl?: string;       // Path to downloadable .pptx
  deckId?: string;        // For per-slide regeneration
}
```

Rendered as sandboxed iframe preview by `SlideDeckView.tsx`. Each slide has a "Regenerate" button that calls `POST /slides/{deckId}/{slideId}/regenerate`. Slide generation progress is shown via `SlidePipelineStepper.tsx` with stages: research → style → planning → quality → visual_identity → images → rendering → validation → packaging.

### Source Links (RAG citations)

```typescript
type SourceLink = { index: number; title: string; url: string; date?: string };
```

Rendered below RAG assistant messages as a "Reference Links" section with numbered links.

---

## State Management

Project uses Redux Toolkit with these slices:

| Slice | Purpose | Key State |
|---|---|---|
| `currentMessageSlice` | Active session's messages | `MessageState[]` |
| `sessionIdSlice` | Current session identity | `sessionId`, `sessionTitle` |
| `messageSlice` | Persisted message store (legacy) | Messages keyed by session |
| `displayMessageSlice` | History-loaded messages | `MessageState[]` |
| `onGoingPromptSlice` | Currently streaming prompt | `MessageState[]` |
| `typingAnimationSlice` | Typing indicator | `isTyping: boolean` |
| `displayMessageLoaderSlice` | History loading | `display: boolean` |
| `fileSlice` | File upload metadata | `fileMetadata`, `status` |
| `userSlice` | Auth state | `token`, `isLoggedIn`, `agentEnabled` |
| `languageSlice` | UI language | `language: "en" \| "ja"` |

---

## Scroll Management

Custom hook `useChatScroll` handles:

- Auto-scroll to bottom during streaming (disabled when user scrolls up)
- Smooth scroll via `requestAnimationFrame` with inertia
- Scroll to specific message
- "Jump to Latest Response" floating button
- MutationObserver + ResizeObserver for layout changes
- User scroll override detection (wheel/touch events)

---

## Internationalization (i18n)

Simple key-value pattern (no library):

```typescript
// src/utils/content.tsx
export const Content: ContentType = {
  messagePlaceholder: {
    en: "Ask Micol...",
    ja: "ミコルに尋ねる...",
  },
};

// Usage
const { language } = useSelector((state) => state.languageSlice);
const t = (key: string) => Content[key]?.[language] ?? Content[key]?.en ?? key;
```

---

## Getting Started in a New Project

### Minimal package dependencies

```json
{
  "react-markdown": "^latest",
  "rehype-highlight": "^latest",
  "rehype-katex": "^latest",
  "remark-gfm": "^latest",
  "remark-math": "^latest",
  "remark-emoji": "^latest",
  "katex": "^latest",
  "highlight.js": "^latest",
  "react": "^18",
  "axios": "^latest",
  "@reduxjs/toolkit": "^latest",
  "react-redux": "^latest",
  "uuid": "^latest"
}
```

### Minimal streaming hook pattern

```typescript
const useChatStream = () => {
  const [messages, setMessages] = useState<MessageState[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const bufferRef = useRef("");
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushBuffer = useCallback((replyId: string) => {
    const chunk = bufferRef.current;
    bufferRef.current = "";
    if (!chunk) return;
    setMessages(prev => prev.map(m =>
      m.uuid === replyId ? { ...m, content: m.content + chunk } : m
    ));
  }, []);

  const scheduleFlush = useCallback((replyId: string) => {
    if (flushTimerRef.current) return;
    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = null;
      flushBuffer(replyId);
    }, 70);
  }, [flushBuffer]);

  const sendMessage = useCallback(async (text: string) => {
    const replyId = uuidv4();
    setMessages(prev => [
      ...prev,
      { type: "right", content: text, tag: "", uuid: uuidv4() },
      { type: "left", content: "", tag: "", uuid: replyId },
    ]);

    abortRef.current = new AbortController();
    const baseURL = "http://192.168.25.219:81/api/";
    const url = `${baseURL}chat/stream`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body!.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "token" && typeof parsed.content === "string") {
              bufferRef.current += parsed.content;
              scheduleFlush(replyId);
            }
          } catch {
            bufferRef.current += data;
            scheduleFlush(replyId);
          }
        }
      }
      flushBuffer(replyId);
    } catch (err: any) {
      if (err.name !== "AbortError") throw err;
    }
  }, [scheduleFlush, flushBuffer]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
  }, []);

  return { messages, sendMessage, cancel };
};
```
