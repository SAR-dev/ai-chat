# AI Chat App Starter — Phase-by-Phase Plan

**Stack:** Vite + React + TypeScript, Tailwind CSS, shadcn/ui, Zustand, react-router-dom, react-markdown, react-i18next (EN / JA), Mock Service Worker

**Core features:** Mock login, chat history sidebar, markdown + math + diagram rendering, artifact/code panel, file upload & preview, message actions (copy/edit/regenerate/feedback/download), settings, English/Japanese localization, "Cobalt" blue theme (light + dark) — all served by a realistic mock API layer so the frontend talks to "endpoints" from day one.

**Design principle:** stay inside the shadcn/ui + Radix ecosystem wherever a component exists for the job (Dialog, Sheet, Tabs, Command, Resizable, Skeleton, Toast/Sonner, Form, Table, Popover, Tooltip, ScrollArea) instead of pulling in a competing UI kit. Only reach outside shadcn for things it doesn't provide: markdown/math/diagram rendering, file parsing, state, animation, and API mocking.

---

## Phase 0 — Project Setup

- [ ] Scaffold project: `npm create vite@latest . -- --template react-ts`
- [ ] Install Tailwind CSS and configure `tailwind.config.js` / `index.css`
- [ ] Initialize shadcn/ui (`npx shadcn@latest init`) — this pulls in `class-variance-authority`, `clsx`, `tailwind-merge`, `tailwindcss-animate`, and `@radix-ui/*` primitives automatically as you add components
- [ ] Add the shadcn components used across the app up front so later phases just import them:
      `npx shadcn@latest add button input textarea label card dialog sheet tabs command dropdown-menu popover tooltip skeleton avatar separator scroll-area badge alert-dialog form select table resizable sonner progress slider toggle-group`
- [ ] Install core dependencies:
  - `zustand` (state)
  - `react-router-dom` (routing)
  - `axios` (HTTP client used by the mock/real API layer — see Phase 3)
  - `react-markdown`, `remark-gfm` (markdown + GFM tables/strikethrough/task lists)
  - `lucide-react` (icons, shadcn's default icon set)
  - `sonner` (toasts)
  - `i18next`, `react-i18next`, `i18next-browser-languagedetector` (localization)
  - `react-hook-form`, `zod`, `@hookform/resolvers` (forms + validation, pairs with shadcn's `Form` component)
- [ ] Set up base folder structure: `components/`, `components/ui/` (shadcn-generated), `pages/`, `stores/`, `lib/`, `hooks/`, `locales/`, `types/`, `mocks/` (MSW handlers, see Phase 3)
- [ ] Add path aliases (`@/`) in `tsconfig.json` and `vite.config.ts`
- [ ] Apply the "Cobalt" blue theme tokens to `globals.css` (light + dark HSL variables for `--primary`, `--background`, `--foreground`, `--card`, `--muted`, `--border`, `--accent`, `--destructive`) and confirm dark-mode toggle switches correctly

**Deliverable:** Empty but running app with Tailwind + shadcn styling confirmed working, using the Cobalt blue theme in both light and dark mode, with the shared shadcn component set already generated.

---

## Phase 1 — Routing & Layout Shell

- [ ] Set up `react-router-dom` with routes: `/login`, `/chat`, `/chat/:sessionId`, `/settings`
- [ ] Build `AppLayout.tsx` (sidebar + main content area, responsive) using shadcn `Resizable` for the sidebar/main split on desktop and `Sheet` for mobile
- [ ] Add dark/light mode toggle via `next-themes`
- [ ] Build placeholder `LoginPage.tsx` and `ChatPage.tsx` (static content only)

**Deliverable:** Navigable app shell with working routes and theme toggle, no real functionality yet.

---

## Phase 2 — Internationalization (EN / JA)

- [ ] Configure `i18next` + `react-i18next` + `i18next-browser-languagedetector`
- [ ] Create `locales/en/translation.json` and `locales/ja/translation.json`
- [ ] Wrap app in `I18nextProvider`; detect browser language on first load, fall back to English
- [ ] Extract all static UI strings (login form, sidebar labels, empty states, buttons, placeholders, toasts, upload messages) into translation keys
- [ ] Add a language switcher using shadcn `DropdownMenu` or `Select`, persist choice to `localStorage`
- [ ] Verify layout doesn't break with longer/shorter Japanese text (button widths, wrapping, sidebar labels)

**Deliverable:** Entire UI switches cleanly between English and Japanese, with a visible language toggle and persisted preference.

---

## Phase 3 — Mock API Layer

This is the foundation the Auth (Phase 4) and Chat Data (Phase 5) layers build on. The goal: the app should talk to a `fetch`/`axios`-based `apiClient` exactly as it would against a real backend, with a **network-level mock** underneath — not ad-hoc `if (mock) {...}` branches inside components or stores. Swapping to a real backend later becomes "change the base URL and remove the mock worker," not a rewrite.

- [ ] Install **Mock Service Worker** (`msw`) — it intercepts requests at the Service Worker / Node layer, so `apiClient` code is production-shaped from the start
- [ ] Run `npx msw init public/ --save` to generate the service worker file for the browser
- [ ] Build `lib/apiClient.ts`: a thin `axios` instance with `baseURL: import.meta.env.VITE_API_BASE_URL` and shared error handling/interceptors (attach auth token header, normalize error shape for toasts)
- [ ] Define the mock REST surface in `mocks/handlers.ts` (grouped by resource):
  - `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`
  - `GET /sessions`, `POST /sessions`, `PATCH /sessions/:id`, `DELETE /sessions/:id`
  - `GET /sessions/:id/messages`, `POST /sessions/:id/messages` (send a message)
  - `POST /messages/:id/regenerate`
  - `POST /messages/:id/feedback`
  - `POST /files` (upload → returns mock id/url/metadata), `GET /files/:id`
- [ ] Implement a **mock streaming endpoint** for chat responses: an MSW handler that returns a chunked `ReadableStream` (or a Server-Sent-Events-formatted body) emitting the canned response token-by-token with small delays — so `apiClient.sendMessage()` reads a real stream the same way it will against the Anthropic API later
- [ ] Back the mock "server" state with an in-memory store inside `mocks/db.ts` (seeded fixtures for sessions/messages), separate from the Zustand client store — this mimics a real backend's database and lets you test cache-invalidation/refetch behavior honestly. Optionally persist this mock DB to `localStorage` under its own namespace (e.g. `mock-db:*`) so seeded data survives reloads during dev
- [ ] Add configurable **latency and error injection**: env vars (`VITE_MOCK_LATENCY_MS`, `VITE_MOCK_ERROR_RATE`) that handlers read to randomly delay or fail requests, so loading/error/retry UI can be exercised realistically instead of only the happy path
- [ ] Wire startup: in `main.tsx`, conditionally `await worker.start()` from `mocks/browser.ts` when `import.meta.env.DEV` or `VITE_USE_MOCKS === "true"`, before rendering the app
- [ ] Build `mocks/server.ts` (Node variant, `setupServer` from `msw/node`) for reuse in Vitest — the same `handlers.ts` powers both the browser dev experience and integration tests (see Phase 16)
- [ ] Add `.env.example` entries: `VITE_API_BASE_URL=/api`, `VITE_USE_MOCKS=true`, `VITE_MOCK_LATENCY_MS=600`, `VITE_MOCK_ERROR_RATE=0`

**Deliverable:** A `mocks/` directory with MSW handlers + an in-memory mock DB serving a realistic REST + streaming API over `apiClient`, toggleable via env var, with configurable latency/error rates — ready for Auth and Chat Data layers to consume.

---

## Phase 4 — Auth (Backed by the Mock API)

- [ ] Build `authStore.ts` (Zustand) holding `user`, `status` (`idle`/`loading`/`error`), and thin actions `login()`/`logout()` that call `apiClient.post("/auth/login", ...)` / `/auth/logout` — the store caches the response, it doesn't fabricate it
- [ ] Persist only the minimal session token/user id via `zustand/middleware` `persist`; on app load, call `GET /auth/me` (through the mock handler) to rehydrate the full user object, mirroring how a real session-restore flow works
- [ ] Build `LoginPage.tsx` using shadcn `Form` (`react-hook-form` + `zod` resolver), `Card`, `Input`, `Button`, `Label`
- [ ] Wire the mock error-rate/latency knobs from Phase 3 to show real loading states and an error toast (`sonner`) on failure, with a retry
- [ ] Build `ProtectedRoute.tsx` — redirects to `/login` if no user in store
- [ ] Wire login success → redirect to `/chat`
- [ ] Add logout action in a shadcn `DropdownMenu` in the sidebar/header
- [ ] Localize all login page strings (EN/JA)

**Deliverable:** Full login flow — log in against the mock `/auth/login` endpoint, session persists/rehydrates on refresh via `/auth/me`, log out, protected `/chat` route, realistic loading/error handling.

---

## Phase 5 — Chat Data Layer (Backed by the Mock API)

- [ ] Build `chatStore.ts` (Zustand): holds a **client-side cache** of `sessions` and `messagesBySessionId`, plus `activeSessionId` and per-request `status` flags — populated by calling `apiClient` methods (`fetchSessions()`, `createSession()`, `renameSession()`, `deleteSession()`, `fetchMessages()`, `sendMessage()`, `regenerateMessage()`, `submitFeedback()`), never by inventing data locally
- [ ] Define types: `ChatSession`, `ChatMessage` (`role`, `content`, `timestamp`, `id`, `attachments?`, `artifacts?`, `feedback?`) shared between the store and the Phase 3 mock handlers/fixtures
- [ ] Seed `mocks/db.ts` with a `mockResponses.ts`-style canned reply pool (markdown-rich samples: tables, code, lists, math, mermaid diagrams, artifact payloads) that the `POST /sessions/:id/messages` handler picks from
- [ ] `sendMessage()` calls the streaming endpoint from Phase 3 and updates the assistant message incrementally in the store as chunks arrive (the actual chunk-reading logic lives here; Phase 12 wires it to the input UI)
- [ ] Keep light local caching (`persist` on `activeSessionId` and, optionally, an offline read-cache of the last-loaded session) — but treat the mock API as the source of truth, so removing MSW later doesn't require restructuring the store

**Deliverable:** Chat state fully functional against the mock API (testable via console/dev tools and Network tab, where requests to `/sessions/*` are visibly intercepted by MSW), no UI yet.

---

## Phase 6 — Chat Sidebar

- [ ] Build `ChatSidebar.tsx`: list of sessions (title, last-updated time via `date-fns`), "New Chat" button
- [ ] Build `SidebarItem.tsx`: active-state highlight, rename (inline edit), delete (confirm via shadcn `AlertDialog`)
- [ ] Add empty state ("No conversations yet") and a loading `Skeleton` state while `fetchSessions()` is in flight
- [ ] Make sidebar collapsible/drawer on mobile (shadcn `Sheet`)
- [ ] Add a session search/quick-switch using shadcn `Command` (`cmdk`), triggerable via `Cmd+K`
- [ ] Localize sidebar strings (EN/JA)

**Deliverable:** Sidebar fully wired to `chatStore` — create, switch, rename, delete, and quick-search sessions, all round-tripping through the mock API.

---

## Phase 7 — Chat Window & Core Markdown Rendering

- [ ] Build `ChatMessage.tsx`: role-based bubble styling (user vs assistant) with shadcn `Avatar`
- [ ] Integrate `react-markdown` + `remark-gfm` for core markdown support: headings, bold/italic, blockquotes, ordered/unordered/nested lists, GFM tables, inline code, sanitized links opening in a new tab
- [ ] Add code block syntax highlighting via `rehype-highlight` + `highlight.js` (simplest) **or** `shiki` (nicer theming, more setup); add a copy-code button per block (`navigator.clipboard`)
- [ ] Build `ChatWindow.tsx`: scrollable message list (shadcn `ScrollArea`), auto-scroll-to-bottom on new message, `Skeleton` state while `fetchMessages()` loads
- [ ] Add `TypingIndicator.tsx` (animated dots) shown while assistant is "responding" — use `framer-motion` for the animation
- [ ] Add empty-conversation state with localized suggested prompts

**Deliverable:** Conversation view correctly renders core markdown content (tables, code, lists, links, formatting) in both languages, fed by the mock API.

---

## Phase 8 — Advanced Content Rendering (Math & Diagrams)

- [ ] Add math rendering: `remark-math` + `rehype-katex` + `katex` (import `katex/dist/katex.min.css`) for inline `$...$` and block `$$...$$` LaTeX
- [ ] Add diagram rendering: `mermaid` — render fenced ` ```mermaid ` blocks client-side into SVG (custom `react-markdown` code-block renderer that detects the `mermaid` language and calls `mermaid.render()`)
- [ ] Add `rehype-raw` if any mock responses need raw HTML passthrough (sanitize with `rehype-sanitize` if enabled)
- [ ] Add `rehype-slug` + `rehype-autolink-headings` for anchorable headings in longer assistant responses
- [ ] Optional: `remark-breaks`, `remark-toc`
- [ ] Add fixtures in `mocks/db.ts` exercising math and diagram output to validate rendering end-to-end

**Deliverable:** Assistant messages can render LaTeX math and Mermaid diagrams alongside standard markdown.

---

## Phase 9 — Artifact / Code Panel

- [ ] Define `Artifact` type: `{ id, type: "code" | "html" | "svg" | "markdown", language?, title, content }`
- [ ] Build `ArtifactPanel.tsx`: a resizable side panel (shadcn `Resizable`) that opens when an assistant message references an artifact
- [ ] Use shadcn `Tabs` inside the panel for "Code" vs "Preview" views
- [ ] Code view: syntax-highlighted read-only content (reuse the Phase 7 highlighter)
- [ ] Preview view: `html`/`svg` artifacts render inside a sandboxed `<iframe srcDoc="...">`; optional richer live-code preview via `@codesandbox/sandpack-react`
- [ ] Add copy-artifact and download-artifact actions (`Blob` + `URL.createObjectURL`)
- [ ] Add an inline "artifact card" in the chat bubble that opens the panel on click
- [ ] Add artifact payloads to the Phase 3 mock fixtures so real conversation turns can surface them

**Deliverable:** Assistant responses can surface a Claude-style artifact card that opens into a dedicated code/preview panel.

---

## Phase 10 — File Upload (Backed by the Mock API)

- [ ] Build `FileUploadButton.tsx` in `ChatInput` (paperclip icon, shadcn `Button` + hidden file input)
- [ ] Support drag-and-drop onto the chat window + paste-from-clipboard for images — use `react-dropzone`
- [ ] Client-side validation: file type allowlist (images, PDF, txt/md/csv, docx, xlsx), max file size, max attachment count per message
- [ ] `apiClient.uploadFile()` posts to the mock `POST /files` handler (Phase 3), which returns a mock id/url/metadata after a simulated delay — build `AttachmentPreview.tsx` around that response (thumbnail for images, icon + filename/size for other files, remove-before-send option)
- [ ] Extend `ChatMessage` type/store to carry `attachments[]` referencing the mock file ids/urls
- [ ] Render attachments inside sent/received messages (image preview, downloadable file chip)
- [ ] Show real upload progress via shadcn `Progress`, driven by axios's `onUploadProgress` against the mock endpoint (MSW can still report progress events for a chunked/delayed response)
- [ ] Localize upload UI strings and error messages (unsupported type, file too large, upload failed — use the Phase 3 error-rate knob to test this) in EN/JA

**Deliverable:** Users can attach files/images to a message via button, drag-drop, or paste; uploads go through the mock `/files` endpoint and attachments display correctly in the conversation.

---

## Phase 11 — File Viewer Modal

- [ ] Build `FileViewerModal.tsx` using shadcn `Dialog` to preview an attachment in place (triggered from an attachment chip), fetching the file's mock URL/content via `GET /files/:id`
- [ ] Images: render directly, with simple CSS zoom/pan or `react-zoom-pan-pinch` for richer control
- [ ] PDFs: `react-pdf` (wraps `pdfjs-dist`) for in-app page rendering
- [ ] `.docx`: `mammoth` to convert to HTML for preview
- [ ] `.xlsx`/`.csv`: `xlsx` (SheetJS) to parse and render into a shadcn `Table`
- [ ] Plain text/markdown: render directly with the Phase 7 markdown pipeline
- [ ] Add a download button in the modal footer

**Deliverable:** Clicking any attachment opens an in-app preview appropriate to its file type instead of forcing a download.

---

## Phase 12 — Chat Input & Streaming (via the Mock API)

- [ ] Build `ChatInput.tsx`: auto-resizing textarea, Enter-to-send / Shift+Enter-newline, send button, disabled state while streaming
- [ ] Integrate the file upload control (Phase 10) into the same input bar
- [ ] Wire `sendMessage()` (Phase 5) to the UI: push the user message immediately (optimistic), show the typing indicator, then render the assistant message incrementally as chunks arrive from the Phase 3 mock streaming endpoint
- [ ] Add a stop-generation button using `AbortController`, cancelling the in-flight `fetch`/`axios` request to the mock stream — this pattern is what real SSE cancellation will look like later, no rewrite needed
- [ ] Handle edge cases: empty input with no attachments, rapid double-send, request failure mid-stream (surface a retry affordance, using the Phase 3 error-injection knob to test it)

**Deliverable:** End-to-end simulated chat experience — type, attach files, send, watch a response genuinely stream in over the mock network layer, with full markdown/math/diagram/artifact rendering.

---

## Phase 13 — Message Actions (Backed by the Mock API)

- [ ] Build a hover/focus action bar on each message (shadcn `Tooltip` + `Button` group): copy, edit-and-resend (user messages), regenerate (assistant messages), feedback, download
- [ ] Copy-to-clipboard: raw markdown source via `navigator.clipboard`
- [ ] Edit-and-resend: inline-editable textarea that replaces the bubble, resubmits via `sendMessage()` and truncates/replaces subsequent history (server-side truncation handled by the mock DB in Phase 3, so refetching stays consistent)
- [ ] Regenerate: calls `POST /messages/:id/regenerate` (Phase 3), replacing the last assistant message via the same streaming path
- [ ] Feedback: thumbs up/down (shadcn `ToggleGroup`) with an optional comment via shadcn `Popover`, posted to `POST /messages/:id/feedback`
- [ ] Download message: export a single message (or whole conversation) as `.md`, using `Blob`/`URL.createObjectURL`
- [ ] Localize all action labels and confirmation copy (EN/JA)

**Deliverable:** Every message supports copy, edit/regenerate, feedback, and download, all round-tripping through the mock API.

---

## Phase 14 — Settings

- [ ] Build a `/settings` route or slide-over (shadcn `Sheet`/`Dialog`) covering: theme (light/dark/system), language, and mock "model" preferences (temperature-style sliders via shadcn `Slider`)
- [ ] Use `react-hook-form` + `zod` for the settings form, persisted via `zustand/persist`
- [ ] Reset-to-defaults action with `AlertDialog` confirmation
- [ ] Localize settings strings (EN/JA)

**Deliverable:** A settings surface that persists user preferences across reloads and ties into the existing theme/language systems.

---

## Phase 15 — Polish & UX Details

- [ ] Loading skeletons (shadcn `Skeleton`) for sidebar/chat on initial load and any in-flight mock request
- [ ] Responsive pass: mobile sidebar drawer, touch-friendly input and upload controls
- [ ] Keyboard shortcuts: `Cmd+K` command palette (Phase 6) extended to also support "new chat," "toggle theme," "go to settings"
- [ ] Accessibility pass: focus states, aria labels, semantic roles, alt text for image attachments, reduced-motion handling for `framer-motion` animations
- [ ] Error boundaries + toast on unexpected/mock-injected errors (`sonner`), with retry affordances wherever a request can fail
- [ ] Performance: virtualize long message lists with `@tanstack/react-virtual` if conversations get long
- [ ] Full EN/JA pass over any remaining hardcoded strings

**Deliverable:** Production-quality starter template feel — polished, responsive, accessible, performant, resilient to the mock API's simulated failures, and fully localized.

---

## Phase 16 — Testing

- [ ] Set up `vitest` + `@testing-library/react` + `@testing-library/jest-dom` + `@testing-library/user-event` + `jsdom`
- [ ] Reuse the Phase 3 `mocks/server.ts` (MSW `setupServer`) in Vitest's global setup so component/integration tests hit the exact same handlers as local dev — no separate test-only mocking layer
- [ ] Unit test the Zustand stores (`authStore`, `chatStore`) against the mock server: login flow, session CRUD, send/stream/regenerate message, feedback
- [ ] Component tests: `ChatMessage` (renders markdown/math/mermaid/artifacts correctly), `ChatSidebar` (CRUD flows), `ArtifactPanel`, `FileViewerModal`
- [ ] Add at least one test that exercises the Phase 3 error-injection path (failed login, failed send) to confirm toasts/retries work
- [ ] Optional: `playwright` for a couple of end-to-end smoke flows (login → send message → see response → open artifact), run against the app with `VITE_USE_MOCKS=true`

**Deliverable:** A test suite covering state logic, mock-API integration, and the highest-risk rendering components, runnable via `npm run test`.

---

## Phase 17 — Cleanup & Documentation

- [ ] Add `README.md`: setup instructions, folder structure overview, **how the mock API layer works and how to swap `VITE_API_BASE_URL`/disable `VITE_USE_MOCKS` for a real backend**, how to add a new mock endpoint/handler, how to add a new locale, how to add a new shadcn component
- [ ] Finalize `.env.example` (`VITE_API_BASE_URL`, `VITE_USE_MOCKS`, `VITE_MOCK_LATENCY_MS`, `VITE_MOCK_ERROR_RATE`)
- [ ] Lint/format pass: `eslint` + `prettier`, `husky` + `lint-staged` pre-commit hook
- [ ] Final build check (`npm run build`) and smoke test in both languages, with mocks on and (once a real backend exists) off
- [ ] Optional: basic CI (`.github/workflows/ci.yml`) running lint → typecheck → test → build on push/PR (tests run against MSW automatically, no live backend needed in CI), and a Vercel/Netlify deploy config

**Deliverable:** Clean, documented, tested, ready-to-clone starter repo whose entire frontend can be developed and demoed with zero real backend.

---

## Appendix A — "Cobalt" theme reference

| Role                       | Light mode | Dark mode |
| -------------------------- | ---------- | --------- |
| Primary                    | `#2F6FEB`  | `#4F86F7` |
| Primary-foreground         | `#FFFFFF`  | `#0B1220` |
| Background                 | `#F7F9FC`  | `#0B1220` |
| Foreground (text)          | `#0F172A`  | `#E5EAF3` |
| Card / surface             | `#FFFFFF`  | `#121A2B` |
| Muted / secondary          | `#EEF2F8`  | `#1A2436` |
| Border                     | `#E2E8F0`  | `#1E293B` |
| Accent (links, highlights) | `#DCE8FD`  | `#1E2F4D` |
| Destructive                | `#E5484D`  | `#F16468` |

`globals.css` HSL variables:

```css
:root {
  --primary: 221 82% 57%;
  --primary-foreground: 0 0% 100%;
  --background: 210 33% 98%;
  --foreground: 222 47% 11%;
  --card: 0 0% 100%;
  --muted: 214 29% 95%;
  --border: 214 32% 91%;
  --accent: 216 79% 92%;
  --destructive: 358 75% 59%;
}

.dark {
  --primary: 217 89% 66%;
  --primary-foreground: 222 47% 7%;
  --background: 222 47% 7%;
  --foreground: 220 38% 93%;
  --card: 219 40% 12%;
  --muted: 217 27% 16%;
  --border: 217 33% 17%;
  --accent: 217 43% 20%;
  --destructive: 358 78% 66%;
}
```

> Note: if you use the shadcn CLI's newer "new-york" style with the latest default template, it may scaffold `oklch()` color values instead of HSL triples. Either format works — keep whichever the CLI generates and just substitute the Cobalt values in the same color space.

---

## Appendix B — Full Package Manifest

### Scaffolding & styling

```
npm create vite@latest . -- --template react-ts
npm install -D tailwindcss postcss autoprefixer
npx shadcn@latest init
npx shadcn@latest add button input textarea label card dialog sheet tabs command dropdown-menu popover tooltip skeleton avatar separator scroll-area badge alert-dialog form select table resizable sonner progress slider toggle-group
```

### State, routing & HTTP

```
npm install zustand react-router-dom axios
```

### Mock API layer

```
npm install -D msw
npx msw init public/ --save
```

### Forms & validation

```
npm install react-hook-form zod @hookform/resolvers
```

### Localization

```
npm install i18next react-i18next i18next-browser-languagedetector
```

### Theming

```
npm install next-themes
```

### Markdown / rich content

```
npm install react-markdown remark-gfm remark-math rehype-katex katex rehype-raw rehype-slug rehype-autolink-headings
npm install rehype-highlight highlight.js      # or: npm install shiki
npm install mermaid
npm install remark-breaks remark-toc           # optional
```

### Artifacts

```
npm install @codesandbox/sandpack-react        # optional — only if you want live/runnable code previews
```

### Files

```
npm install react-dropzone
npm install react-pdf                          # PDF preview
npm install mammoth                            # .docx preview
npm install xlsx                               # .xlsx/.csv preview
```

### Utilities & animation

```
npm install uuid date-fns framer-motion
npm install -D @types/uuid
```

### Performance (optional, Phase 15)

```
npm install @tanstack/react-virtual
```

### Testing

```
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
npm install -D @playwright/test                # optional, e2e
```

### Tooling

```
npm install -D eslint prettier husky lint-staged
```

### Explicitly dropped from the legacy MUI/Redux app (superseded by shadcn/Tailwind equivalents)

- `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled` → replaced by Tailwind + shadcn/Radix
- `@radix-ui/themes` → shadcn already composes bare `@radix-ui/react-*` primitives directly
- `@reduxjs/toolkit`, `redux`, `react-redux` → replaced by `zustand`
- `sweetalert2` → replaced by `sonner` (toasts) + shadcn `AlertDialog` (confirmations)
- `react-scripts` (CRA) → replaced by Vite's own dev/build/test tooling (`vitest` instead of CRA's Jest wrapper)
- `plantuml-encoder` → optional; only re-add if PlantUML diagrams (not just Mermaid) are a hard requirement
- `flowtoken` → the mock token streaming in Phase 12 is served by the Phase 3 MSW streaming handler + a small reader hook; re-add only if `flowtoken`'s specific animation quality is wanted on top

---

## Why MSW over alternatives

Worth noting briefly, since "mock API" can mean a few different things:

- **MSW (chosen)** intercepts at the network layer (Service Worker in the browser, request interception in Node for tests). App code always calls a real `apiClient` over `fetch`/`axios`; nothing in components or stores knows it's mocked. Same handlers work in dev and in Vitest.
- **`json-server` / a local Express mock server** — also viable, and arguably closer to "a real backend," but means running a second process and duplicating auth/streaming logic outside the frontend repo. Worth switching to later if the mock needs to be shared with a separate mobile client or QA team.
- **Ad-hoc `if (import.meta.env.DEV)` branches in stores** — avoided on purpose; it couples mock logic to application logic and doesn't exercise real loading/error states or survive the swap to a real backend cleanly.

If the project later needs the mock API reachable from outside the browser (e.g., a QA environment, or a native mobile client hitting the same fixtures), swap MSW for `json-server`/a tiny Express app using the same `mocks/db.ts` fixtures — the `apiClient` and route contracts don't need to change.

---

## Future Extension Points (not in initial scope)

- Swap the mock API for a real backend: point `VITE_API_BASE_URL` at it, set `VITE_USE_MOCKS=false`, delete/retire `mocks/` once parity is confirmed — `apiClient` and the stores shouldn't need to change
- Swap mock streaming for real Anthropic API calls (streaming SSE), including sending uploaded files to the API and streaming artifact content incrementally — the `AbortController`-based streaming path from Phase 12 carries over directly
- Real file storage/backend upload endpoint (replacing the mock `/files` handler)
- Multi-user backend persistence (replace `mocks/db.ts` and any localStorage caches)
- Additional locales beyond EN/JA
- Message search across history (extend the Phase 6 `Command` palette to full-text search, backed by a real search endpoint)
- Slide-deck / structured-output viewer, if that use case comes back into scope
