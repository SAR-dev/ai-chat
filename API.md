# Kiku Chat Frontend — API Documentation

Base URL is configurable via `VITE_API_BASE_URL` environment variable. In production, requests are proxied through Nginx (`/api/` → backend).

> **Note:** This document covers both API contract details AND the UI rendering flow that drives conditional display of components based on API response data.

---

## Authentication

### POST `/login` — Standard Login

**Auth:** No

**Request:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response (200):**
```json
{
  "message": "string",
  "recent_sessions": [],
  "token": "string",
  "user": {
    "display_name": "string",
    "email": "string",
    "id": "number",
    "is_verified": "boolean",
    "username": "string",
    "agent_enabled": "boolean"
  }
}
```

**Usage:** Submit credentials → store token in Redux + localStorage → navigate to `/chat`.

---

### POST `/login/ad` — Active Directory Login

**Auth:** No

**Request:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response (200):**
```json
{
  "auth_method": "string",
  "message": "string",
  "recent_sessions": [],
  "token": "string",
  "user": { ... }
}
```

**Usage:** Same as standard login. Username typically includes domain prefix (e.g. `domain\user`).

---

### POST `/register` — User Registration

**Auth:** No

**Request:**
```json
{
  "username": "string",
  "password": "string",
  "email": "string"
}
```

**Response (200):**
```json
{
  "email": "string",
  "message": "string",
  "user_id": "string",
  "username": "string",
  "verification_required": "boolean",
  "verification_token": "string"
}
```

**Usage:** Submit registration form → show success/error toast.

---

## Chat (Streaming SSE)

These endpoints use **raw `fetch()`** (not axios) for ReadableStream support. All require `Authorization: Bearer <token>` and `x-session-id` headers. The stream is parsed line-by-line as SSE.

---

### POST `/chat/stream` — Default Chat (LLM)

**Auth:** Yes (Bearer token + session ID)

**Content-Type:** `application/json` (or `multipart/form-data` when including a file)

**Request (JSON):**
```json
{
  "message": "string",
  "session_id": "string (optional)",
  "mode": "fast | thinking (optional)",
  "internet_search": "boolean (optional)",
  "slide_mode": "standard | creative (optional)",
  "agent_mode": "boolean (optional)",
  "file": "File (via FormData, optional)"
}
```

**Response:** SSE stream (see event types below)

---

### POST `/query/stream` — RAG Chat (Retrieval-Augmented Generation)

**Auth:** Yes (Bearer token + session ID)

**Request:**
```json
{
  "query": "string",
  "show_context": "boolean (optional, default false)",
  "top_k": "string",
  "session_id": "string (optional)",
  "category": "string",
  "mode": "fast | thinking (optional)",
  "internet_search": "boolean (optional)",
  "agent_mode": "boolean (optional)"
}
```

**Response:** SSE stream (same structure as `/chat/stream`, but text tokens use `answer` field instead of `reply`)

---

### SSE Event Types

Events are parsed line-by-line. The `event:` field determines the type; `data:` contains the payload.

| Event | data format | Description |
|---|---|---|
| *(no event)* | `{"content": "..."}` / `{"chunk": "..."}` / `{"delta": "..."}` / `{"reply": "..."}` / `{"full_text": "..."}` / `"plain string"` / `{"type": "token", "content": "..."}` | Streaming text token |
| `title_updated` | `{"session_title": "...", "session_id": "..."}` | Session title auto-update |
| `agent_tools` | `{"tools": ["..."], "reasoning": "..."}` | Agent tool usage metadata |
| *(no event)* | `{"type": "artifact", "artifact": {...}}` | Chart / KPI / Table artifact |
| *(no event)* | `{"type": "image", "image": {"b64": "...", ...}}` | FLUX-generated image |
| *(no event)* | `{"type": "image_status", "message": "..."}` | Image generation progress |
| *(no event)* | `{"type": "slide", "slide": {...}}` | Slide deck |
| *(no event)* | `{"type": "slide_status", "stage": "...", "stage_status": "...", "message": "..."}` | Slide generation stage update |
| *(no event)* | `{"type": "done", "assistant_message_id": "number (optional)"}` | Stream complete |

**Artifact types** (normalized client-side):
- `line`, `bar`, `pie`, `area`, `scatter`, `forecast`, `heatmap` charts
- `kpi` card
- `table`

**Slide stage IDs** (for progress tracking):
- `research`, `style`, `planning`, `quality`, `visual_identity`, `images`, `rendering`, `validation`, `packaging`
- Each stage has state: `active`, `done`, `skipped`, `error`

**Usage pattern (React):**
```typescript
const response = await fetch(`${API_BASE_URL}chat/stream`, {
  method: "POST",
  headers: { "Authorization": `Bearer ${token}`, "x-session-id": sessionId, "Content-Type": "application/json" },
  body: JSON.stringify(payload),
  signal: abortController.signal,
});
const reader = response.body.getReader();
const decoder = new TextDecoder();
// Read chunks, buffer with ~70ms flush for batched DOM updates
// Call onChunk, onMeta, onAgentTools, onArtifact, onImage, onSlide, onDone callbacks
```

---

### POST `/chat/download` — Export as DOCX

**Auth:** Yes (Bearer token)

**Request:**
```json
{
  "content": "string",
  "format": "docx",
  "filename": "string"
}
```

**Response:** Binary `.docx` blob (triggers file download)

**Note:** TXT, MD, CSV, XLSX exports are handled client-side (no API call).

---

## Session Management

### GET `/sessions?limit={n}&offset={n}` — Session History List

**Auth:** Yes

**Query params:** `limit` (number), `offset` (number)

**Response (200):**
```json
{
  "count": "number",
  "sessions": [
    { "id": "string", "title": "string" }
  ]
}
```

**Client mapping:** `session_id` ← `id`, `header_text` ← `title`

**Usage:** Populate sidebar list. Called on mount and on "Load More" click (incremental pagination).

---

### GET `/sessions/{session_id}` — Session Messages

**Auth:** Yes

**Response (200):**
```json
{
  "session": {
    "id": "string",
    "title": "string",
    "category": "string"
  },
  "messages": [
    {
      "id": "number",
      "content": "string",
      "role": "string",
      "created_at": "string",
      "is_helpful": "boolean | null (optional)",
      "sources": "array (optional, RAG only)",
      "artifacts": "array (optional)"
    }
  ]
}
```

**Usage:** Load full chat history for a session. Client sorts by `created_at` then `id`. Artifacts, images, and slides are re-hydrated from IndexedDB by session+message key.

---

### DELETE `/sessions/{session_id}` — Delete Session

**Auth:** Yes

**Response (200):**
```json
{
  "message": "string"
}
```

**Usage:** Remove session from sidebar. If deleting currently active session, clear state and redirect.

---

### POST `/sessions/{sessionId}/messages/truncate` — Truncate Messages (Edit & Resend)

**Auth:** Yes

**Request:**
```json
{
  "from_message_id": "number"
}
```

**Response (200):**
```json
{
  "deleted": "number"
}
```

**Usage:** Deletes a message and all subsequent messages, then resends the edited version.

---

## Feedback

### POST `/messages/{messageId}/feedback` — Submit Message Feedback

**Auth:** Yes

**Request:**
```json
{
  "is_helpful": "boolean | null"
}
```

**Response (200):**
```json
{
  "message": "string",
  "message_id": "number",
  "is_helpful": "boolean",
  "cache_invalidated": "boolean"
}
```

**Usage:** Thumbs up/down toggle. Sending `null` removes previous feedback. Shows success/error toast.

---

## Categories

### GET `/categories` — RAG Categories

**Auth:** Yes

**Response (200):**
```json
[
  { "name": "string" }
]
```

**Usage:** Populate RAG category dropdown. `"normalChat"` is the sentinel for non-RAG (regular LLM) mode.

---

## User Settings

### GET `/user/settings` — Get Settings

**Auth:** Yes

**Response (200):**
```json
{
  "agent_enabled": "boolean"
}
```

---

### PATCH `/user/settings` — Update Settings

**Auth:** Yes

**Request:**
```json
{
  "agent_enabled": "boolean"
}
```

**Response (200):**
```json
{
  "agent_enabled": "boolean"
}
```

**Usage:** Persist agent mode toggle to server.

---

## Slides

### POST `/slides/{deckId}/{slideId}/regenerate` — Regenerate a Single Slide

**Auth:** Yes

**Request:**
```json
{
  "instruction": "string"
}
```

**Response (200):**
```json
{
  "deck_id": "string",
  "slide_id": "number",
  "html_fragment": "string | null",
  "pptx_url": "string"
}
```

**Usage:** Replaces a single slide's HTML in the preview and updates the PPTX download URL.

---

## Request Management

### POST `/request/cancel/{requestId}` — Cancel Active Request

**Auth:** Yes

**Response (200):**
```json
{
  "message": "string",
  "request_id": "string",
  "status": "string"
}
```

**Usage:** Cancel an ongoing streaming request on the server. Also aborts client-side `AbortController`. Errors are silently ignored.

---

### GET `/request/active` — Get Active Requests

**Auth:** Yes

**Response (200):**
```json
{
  "active_requests": [
    {
      "request_id": "string",
      "status": "string",
      "created_at": "string"
    }
  ],
  "count": "number"
}
```

**Usage:** List all active/in-flight requests for the current user.

---

## Common Headers

| Header | Value | When |
|---|---|---|
| `Authorization` | `Bearer <token>` | All authenticated requests |
| `x-session-id` | `<session_uuid>` | All requests (managed by Redux `sessionIdSlice`) |
| `Content-Type` | `application/json` | Default (axios), `multipart/form-data` for file uploads |
| `withCredentials` / `credentials: "include"` | `true` | All requests (sends cookies cross-origin) |

## Token & Session

- JWT token is stored in `localStorage` under key `kikuchat:user` with a **6-hour TTL**.
- Token and session ID are read from Redux store on every request.
- On 401 response, the client dispatches a `logout()` action (currently commented out).

## SSE Streaming Implementation Notes

1. **Transport:** Native `fetch()` with `response.body.getReader()` — axios does not support ReadableStream.
2. **Buffering:** Chunks are buffered and flushed every **70ms** for batched DOM updates (prevents layout thrashing).
3. **Abort:** Each stream has a paired `AbortController` for cancellation.
4. **File upload:** Uses `FormData` without explicit `Content-Type` header (browser sets `multipart/form-data` boundary automatically).
5. **Artifact normalization:** All artifact/image/slide data is normalized client-side before being added to Redux state.

## Client-Side Persistence (IndexedDB)

Database: `kikuchat` (version 2)

| Store | Content | Key |
|---|---|---|
| `generated_images` | Base64 image data URLs | `sessionId:messageId` |
| `generated_slides` | Slide deck HTML previews | `sessionId:messageId` |

**Rationale:** Images and slide HTML are delivered via SSE but not stored on the server. IndexedDB re-hydrates them when session history is reloaded. **Max 20 sessions** — oldest are auto-pruned on write.

## Nginx Reverse Proxy

```nginx
location /api/ {
    proxy_pass $BACKEND_API_URL/api/;
    proxy_buffering off;              # Required for SSE
    proxy_read_timeout 900s;          # Backend timeout
    chunked_transfer_encoding on;
}
```

---

## Type Reference

### Request Types

| Type | Fields |
|---|---|
| `LoginPayLoad` | `username: string, password: string` |
| `RegistrationRequest` | `username: string, password: string, email: string` |
| `DefaultChatServicesRequest` | `message: string, session_id?: string, file?: File, mode?: "fast" \| "thinking", internet_search?: boolean, slide_mode?: "standard" \| "creative", agent_mode?: boolean` |
| `RagChatRequest` | `query: string, show_context?: boolean, top_k: string, session_id?: string, category: string, mode?: "fast" \| "thinking", internet_search?: boolean, agent_mode?: boolean` |
| `ChatDeleteRequest` | `session_id: string` |
| `SessionHistoryRequest` | `limit: number, offset: number` |
| `FeedbackRequest` | `is_helpful: boolean \| null` |
| `TruncateRequest` | `from_message_id: number` |
| `UserSettings` | `agent_enabled: boolean` |
| `SlideRegenerateRequest` | `instruction: string` |

### Response Types

| Type | Fields |
|---|---|
| `LoginResponse` | `message: string, recent_sessions: array, token: string, user: User` |
| `ADLoginResponse` | `auth_method: string, message: string, recent_sessions: array, token: string, user: User` |
| `RegistrationResponse` | `email: string, message: string, user_id: string, username: string, verification_required: boolean, verification_token: string` |
| `DefaultChatServicesResponse` | `session_id: string, reply: string, session_title?: string, request_id?: string` |
| `RagChatResponse` | `session_id: string, question: string, answer: string, retrieved: array, session_title?: string, request_id?: string` |
| `ChatHistoryResponse` | `session: { id, title, category }, messages: Message[]` |
| `ChatDeleteResponse` | `message: string` |
| `SessionHistoryResponse` | `session_id: string, header_text: string` |
| `FeedbackResponse` | `message: string, message_id: number, is_helpful: boolean, cache_invalidated: boolean` |
| `UserSettings` | `agent_enabled: boolean` |
| `RegenerateSlideResponse` | `deck_id: string, slide_id: number, html_fragment: string \| null, pptx_url: string` |
| `CancelRequestResponse` | `message: string, request_id: string, status: string` |
| `ActiveRequestsResponse` | `active_requests: array, count: number` |

### User Object

```typescript
{
  display_name?: string;
  email: string;
  id: number;
  is_verified: boolean;
  username: string;
  agent_enabled?: boolean;
}
```

### Message Object (in history)

```typescript
{
  id: number;
  content: string;
  role: string;
  created_at: string;
  is_helpful?: boolean | null;
  sources?: SourceLink[];
  artifacts?: ArtifactData[];
}
```

### ArtifactData

```typescript
type ChartType = "line" | "bar" | "pie" | "area" | "scatter" | "forecast" | "heatmap";

interface ArtifactData {
  type: "chart" | "kpi" | "table";
  title?: string;
  // chart-specific fields for each chart type
  // kpi fields: metric, value, unit, delta, trend
  // table fields: headers, rows
}
```

---

## UI Rendering & Conditional Flow

This section describes how the UI drives and reacts to API calls. Understanding this flow is essential when implementing the same API in another frontend.

---

### Core UI State: `MessageState`

Every chat message in Redux is represented by this type. **Its fields directly drive all conditional rendering.**

| Field | Type | Controls in UI |
|---|---|---|
| `type` | `"right" \| "left"` | **right** = user bubble (plain text, right-aligned). **left** = assistant bubble (markdown, left-aligned, rich content). |
| `content` | `string` | Existence → renders `MarkDownPreviewer`. Empty + not cancelled → shows "thinking" dots placeholder. |
| `cancelled` | `boolean` | Shows "Request cancelled" notice. Hides feedback buttons. |
| `agentTools` | `string[]` | Shows collapsible "agent activity" section with tool icons. |
| `agentReasoning` | `string` | Content inside the expanded agent activity section. |
| `imageStatus` | `string` | Shows shimmer skeleton + "Generating image..." status line. |
| `images` | `GeneratedImage[]` | Array present → renders `<GeneratedImageView>` cards with zoom. Clears `imageStatus`. |
| `slideStatus` | `string` | Legacy fallback: shows "Creating slides..." spinner. |
| `slideStages` | `Record<SlideStageId, SlideStageEvent>` | Drives `<SlidePipelineStepper>` — per-stage progress icons. Clears `slideStatus`. |
| `slides` | `SlideDeck[]` | Renders `<SlideDeckView>` for each deck. Clears `slideStatus`/`slideStages`. |
| `sources` | `SourceLink[]` | Non-empty → renders source citation list with numbered links. |
| `artifacts` | `ArtifactData[]` | Inline `⟦ARTIFACT:N⟧` placeholders in content → interleaves chart/KPI/table renderers. |
| `isRagMessage` | `boolean` | Controls visibility of `<MessageFeedback>` thumbs up/down. |
| `assistantMessageId` | `number` | Enables feedback submission. Required for `/messages/{id}/feedback`. |
| `uuid` | `string` | Matches `isStreamingMessageId` → enables live streaming text rendering, hides actions/feedback. |
| `file` | `FileAttachment` | Shows file preview in user message bubble. |
| `dbId` | `number` | Used in edit & resend flow to determine truncation point. |

---

### Chat Page: Three-Way Root State

The `ChatBox` component renders one of three layouts based on:

```
isRestoring (local boolean)          ← true while loading session history
isEmptyChat = messages.length === 0  ← derived from Redux
```

| State | Renders |
|---|---|
| **Restoring** | Spinner + "Loading..." |
| **Empty chat** | Model selector (Fast/Thinking), centered welcome message, input at center |
| **Active chat** | Model selector + scrollable message list + fixed-bottom input |

**Flow:**
1. On page load with a session ID in URL → `isRestoring = true`, fetches `GET /sessions/{id}`.
2. On fetch complete → messages populate Redux → `isRestoring = false`. If no messages → `isEmptyChat = true`.

---

### Chat Submit: Endpoint Selection

When user submits a message, the hook chooses one of two routes:

```
isTagSelected (prop) = user selected a RAG category (non-"normalChat")
```

```
┌─ isTagSelected = true  ─→  POST /query/stream  (RAG)
├─ isTagSelected = false ─→  POST /chat/stream    (Default LLM)
└─ file attached         ─→  POST /chat/stream with FormData
```

---

### Streaming SSE → UI Update Mapping

Each API response type maps to a specific UI update:

#### Text Tokens (both endpoints)

SSE data: `{ content }` / `{ chunk }` / `{ delta }` / `{ reply }` / `{ answer }` (RAG) / `"plain string"`

→ Content is buffered in `streamBufferRef` and flushed to `message.content` every **70ms** for batched DOM updates.

**UI effect:** The assistant message bubble grows incrementally. During streaming, syntax highlighting is disabled. On flush, `MarkDownPreviewer` re-renders with new text.

#### Title Update (both)

SSE data: `{ session_title, session_id }`

→ Dispatches to `sessionIdSlice` → sidebar session title refreshes. New sessions are prepended to sidebar, existing ones updated.

#### Agent Tools (both)

SSE data: `{ tools: string[], reasoning?: string }`

→ Sets `message.agentTools` + `message.agentReasoning`. Collapsible section appears at top of assistant message:

| Tool name | Icon shown |
|---|---|
| `rag_search` | 🔍 "RAG Search" |
| `web_search` | 🌐 "Web Search" |
| `company_kb_search` | 📚 "Company KB Search" |
| other | 🧰 "Tool: {name}" |

#### Artifact (both)

SSE data: `{ type: "artifact", artifact: { type: "chart"|"kpi"|"table", ... } }`

→ Appended to `message.artifacts[]`. The content text may contain `⟦ARTIFACT:N⟧` placeholders. When rendering:
1. Content is split on these placeholders
2. Text segments → `MarkDownPreviewer`
3. Artifact segments → `ArtifactRenderer` (chart library for charts, KPI card component for KPIs, table component for tables)
4. Trailing artifacts (no matching placeholder) are appended after all text

#### Image Generation (default chat only)

SSE data:
- `{ type: "image_status", message: "..." }` → Sets `message.imageStatus`. UI shows skeleton shimmer + status text.
- `{ type: "image", image: { b64: "data:image/...", prompt?, caption?, width?, height? } }` → Appends to `message.images[]`, clears `imageStatus`. UI renders `<GeneratedImageView>` with zoomable lightbox.

**Persistence:** Images are saved to IndexedDB under `generated_images` store, keyed by `sessionId:assistantMessageId`. On session reload, `GET /sessions/{id}` messages are re-hydrated with IndexedDB images.

#### Slide Generation (default chat only)

SSE data:
- `{ type: "slide_status", stage, stage_status, message }` → (Legacy) Sets `message.slideStatus`. UI shows spinner.
- `{ type: "slide_status", stage, stage_status: "active"|"done"|"skipped"|"error", message }` → Updates `message.slideStages[stage]`. UI renders `<SlidePipelineStepper>` with per-stage status:
  | Status | Icon |
  |---|---|
  | `done` | ✓ checkmark |
  | `active` | ⟳ spinner |
  | `error` | ! error |
  | `skipped` | – dash |
  | `pending` | ○ empty circle |
- `{ type: "slide", slide: { html, title, slideCount, pptxUrl?, deckId? } }` → Appends to `message.slides[]`, clears `slideStatus`/`slideStages`. UI renders `<SlideDeckView>` with HTML iframe preview.

**Stage catalog (9 stages):**
1. `research` — 情報収集
2. `style` — スタイル選定
3. `planning` — 構成作成
4. `quality` — 品質チェック
5. `visual_identity` — ビジュアル選定
6. `images` — 画像検索
7. `rendering` — レンダリング
8. `validation` — 検証
9. `packaging` — PPTX作成

**Persistence:** Same as images — saved to IndexedDB `generated_slides` store, re-hydrated on session reload.

#### Sources (RAG only)

SSE data: `{ type: "sources", sources: [{ index, title, url, date? }] }`

→ Sets `message.sources[]`. UI renders an ordered list of deduplicated source links below the message content. Citation markers `【N】` and `[N]` in content text are hyperlinked to corresponding sources.

**Source processing pipeline:**
1. Deduplicate by URL
2. Renumber sequential indices
3. Strip reference footer from content
4. Rewire citation markers to match new indices
5. Convert `【N】` / `[N]` → markdown link `[N](#source-n)`

#### Stream Complete (both)

SSE data: `{ type: "done", assistant_message_id?: number }`

→ Flushes remaining buffer → sets `isTypingAnimation = false` → cleanup. After this:
- Feedback/action buttons appear
- Copy/download buttons activate
- Streaming text finalizes (syntax highlighting enabled)

#### Cancellation (client-side + server)

1. User clicks stop button → `AbortController.abort()` + `POST /request/cancel/{requestId}`
2. Buffered content is flushed to message
3. `message.cancelled = true` → UI shows "Request cancelled" notice
4. Typing animation ends

---

### Chat Messages Component: Conditional Rendering Tree

```
ChatMessages
├── "Load N older" button (if older messages exist beyond rendered window)
└── message list (windowed: last 60 by default, +40 per "load more")
    └── each message (by type):
        ├── type === "right" (USER)
        │   ├── Plain text content (no markdown)
        │   ├── File preview (if message.file exists)
        │   └── Actions row (copy, edit) — only if content.length > 0 and not cancelled
        │
        └── type === "left" (ASSISTANT)
            ├── Agent tools section (if agentTools.length > 0)
            │   └── Collapsible: tool icons + reasoning text
            │
            ├── Image status (if imageStatus) — skeleton + "generating..."
            │
            ├── Images (if images.length > 0) — GeneratedImageView cards
            │
            ├── Slide pipeline stepper (if slideStages keys > 0)
            ├── Slide status (if slideStatus, legacy fallback)
            ├── Slides (if slides.length > 0) — SlideDeckView
            │
            ├── Content (text)
            │   ├── ⟦ARTIFACT:N⟧ present? → split & interleave with ArtifactRenderer
            │   └── No artifacts? → single MarkDownPreviewer
            │       └── Streaming? → disable syntax highlighting
            │
            ├── Sources (if sources.length > 0) — numbered link list
            │
            ├── "Thinking" placeholder (if content empty + not cancelled + no gen status + no agent tools)
            │   └── Robot icon + bouncing dots
            │
            ├── Cancelled notice (if cancelled)
            │
            ├── Feedback thumbs (if isRagMessage + not cancelled + not streaming)
            │
            └── Actions row (copy, download) — if content.length > 0 and not cancelled and not streaming
```

---

### Edit & Resend Flow

1. User clicks edit icon on their own message
2. `handleEditMessage(target)` is called
   - Guard: cannot edit during streaming
   - Finds the target message index
   - Determines `fromId` for truncation: `target.dbId` or `reply.assistantMessageId - 1`
   - Slices all messages from that point onward
   - Sets composer text to the original message content
   - Auto-focuses textarea, places cursor at end
3. User edits and resubmits
4. `TruncateSessionMessages(sessionId, fromId)` → `POST /sessions/{id}/messages/truncate`
5. New API call proceeds normally

---

### Session History (Sidebar) Rendering

```
Sidebar
├── Session items from GET /sessions?limit=N&offset=N
│   ├── Loading state → PulseLoader spinner
│   ├── Empty state → nothing rendered
│   ├── Error state → SweetAlert2 error toast (3s)
│   └── Active session highlight:
│       ├── #EEF2FF background + font-weight 500
│       └── Matched by: clickedIndex OR activeSessionId from Redux
│
├── "Load More" button
│   └── Hidden when isEndOfHistory = true (API returned 0 results)
│
└── Per-item actions:
    ├── Click → navigate to session
    ├── Ellipsis menu → "Delete" option
    │   └── SweetAlert2 confirmation → DELETE /sessions/{id}
    │       └── If deleting active session → clear state + redirect
    └── Auto-select on create:
        └── When new session is created → prepend to list, auto-highlight
```

---

### Login Page: Three-Way Mode

```
LoginPage
├── mode === "ad" (default)
│   ├── AD login form (username with domain hint)
│   ├── "Login with Username" link → mode = "standard"
│   └── API: POST /login/ad
│
├── mode === "standard"
│   ├── Standard login form
│   ├── "Back" button → mode = "ad"
│   └── API: POST /login
│
└── mode === "select" (not currently used)
```

**States per form:**
- Loading: submit button shows `<ScaleLoader>` spinner + `disabled`
- Validation failure: SweetAlert2 toast (no API call)
- API error: SweetAlert2 toast with server error or generic message
- Success: dispatch `login()` Redux action → navigate to `/chat`

---

### Registration Modal

```
Registration (modal overlay)
├── Closed (isOpen === false) → return null
├── Loading → button shows ScaleLoader spinner
├── Success → SweetAlert2 toast → onClose()
└── Error → SweetAlert2 error toast (3s)
```

**Client-side validation rules:**
| Field | Rule |
|---|---|
| Username | `[a-zA-Z0-9_-]`, 3–15 chars |
| Password | 8+ chars, at least 1 letter + 1 digit |
| Email | Standard email regex |

---

### Slide Deck View: Conditional Render

```
SlideDeckView
├── Header: icon + title + "N slides" + PPTX badge
├── Action row:
│   ├── "Regenerate" button (only if deck.deckId exists)
│   │   └── Click → shows form:
│   │       ├── Slide number select
│   │       ├── Instruction text input
│   │       └── "Apply" → POST /slides/{deckId}/{slideId}/regenerate
│   │           └── Success: splice HTML fragment, update pptxUrl
│   │
│   ├── "Full screen" button (disabled if blob URL failed)
│   └── "Download" link (only if pptxUrl resolves) → triggers PPTX download
│
└── Preview: <iframe srcdoc={html} sandbox="allow-scripts" loading="lazy" />
```

**Regeneration flow:**
1. User clicks "Regenerate" → `editing = true`
2. User selects slide number + writes instruction → submits
3. API returns `{ html_fragment, pptx_url }`
4. `spliceSlideFragment()` replaces `<section data-slide-id="N">` in HTML
5. Local `html` state updated, `pptxUrl` refreshed
6. **Note:** Regenerated slides update local state only; not synced back to Redux or IndexedDB. Page reload reverts to original.

---

### Message Feedback: Toggle Logic

```
MessageFeedback
├── Hidden (empty div) if isStreaming OR !assistantMessageId
│
├── Thumbs-up button
│   └── Active styling when isHelpful === true
│   └── Click behavior:
│       ├── Currently true → set to null (deselect)
│       └── Currently false/null → set to true
│
├── Thumbs-down button
│   └── Active styling when isHelpful === false
│   └── Click behavior:
│       ├── Currently false → set to null (deselect)
│       └── Currently true/null → set to false
│
└── On submit → POST /messages/{id}/feedback
    ├── Success → localized toast (different messages for up/down/deselect)
    └── Error → revert to previous value + error toast
```

---

### Complete User Flow Summary

```
User Action              API Call                          UI Update
─────────────            ────────                          ─────────
Login click              POST /login or /login/ad          Navigate to /chat, store token
Registration submit      POST /register                    Toast success/error, close modal
Send message (normal)    POST /chat/stream (SSE)           Streaming text + artifacts + images + slides
Send message (RAG)       POST /query/stream (SSE)          Streaming text + sources
Cancel request           POST /request/cancel/{id}         "Cancelled" notice, abort stream
Edit & resend            POST .../messages/truncate        Remove old messages, populate composer
                         then POST .../stream              Normal stream flow
Delete session           DELETE /sessions/{id}             Remove from sidebar, clear state if active
Load session history     GET /sessions?limit=&offset=      Populate sidebar list
Click sidebar session    GET /sessions/{id}                Load messages into chat area
Feedback click           POST /messages/{id}/feedback      Toggle thumb icon, toast
Regenerate slide         POST /slides/{deckId}/{slideId}/  Update slide HTML preview
                         regenerate
Export as DOCX           POST /chat/download               Trigger file download
Select RAG category      (none, local state)               Hide model selector, clear session
Toggle agent mode        PATCH /user/settings              Persist preference
```
