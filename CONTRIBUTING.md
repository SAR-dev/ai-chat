# Contributing to KikuChat

KikuChat is an AI chat application for Mass Holdings Ltd., powered by the "Kikuma" model. It supports standard chat, RAG queries, image generation, slide deck creation, internet search, and agent-based tool usage — all with streaming responses, rich markdown rendering, and bilingual English/Japanese localization.

## Tech Stack

| Category             | Technology                                                                          |
| -------------------- | ----------------------------------------------------------------------------------- |
| **Framework**        | React 19 + TypeScript 6.0 (strict)                                                  |
| **Build Tool**       | Vite 8                                                                              |
| **Deployment**       | Docker + nginx (multi-stage build, SPA + API proxy)                                 |
| **Routing**          | react-router-dom v7                                                                 |
| **State Management** | Zustand 5 + IndexedDB (pinned sessions, generated images, slides)                   |
| **Styling**          | Tailwind CSS 4 + Base/Lyra (shadcn/ui)                                              |
| **Animation**        | Framer Motion 12                                                                    |
| **Icons**            | Phosphor Icons (primary), Lucide React (supplemental)                               |
| **HTTP Client**      | Axios (with SSE streaming)                                                          |
| **Forms**            | react-hook-form + zod                                                               |
| **i18n**             | react-i18next + i18next-browser-languagedetector                                    |
| **Markdown**         | react-markdown + remark/rehype plugins (math, diagrams, syntax highlighting, emoji) |
| **Charts**           | Recharts                                                                            |
| **Diagrams**         | Mermaid 11                                                                          |
| **Package Manager**  | pnpm                                                                                |
| **Linting**          | ESLint 9 (flat config) + oxlint                                                     |
| **Formatting**       | Prettier + prettier-plugin-tailwindcss                                              |

## Getting Started

**Prerequisites:** Node.js 20+ and pnpm.

```bash
pnpm install
pnpm dev          # Starts Vite dev server
```

### Docker (production)

```bash
# Build and run the frontend standalone
docker build -t kikuchat .
docker run -p 80:80 kikuchat

# Or with docker compose
docker compose up --build
```

The SPA is built with `VITE_API_BASE_URL=/api` so API calls go through nginx at the same origin. The nginx config proxies `/api/` requests to `http://backend:81/api/`.

To point to a different backend, pass the build arg:

```bash
docker build --build-arg VITE_API_BASE_URL=https://example.com/api -t kikuchat .
```

Or use a custom backend host in docker compose:

```yaml
services:
  frontend:
    build:
      context: .
      args:
        VITE_API_BASE_URL: /api
    ports:
      - '80:80'
    extra_hosts:
      - 'backend:192.168.1.100'
```

**Login:** Use `demo@example.com` with any password (the app connects to a real backend at `http://192.168.25.219:81/api` by default). To point to a different backend, update `VITE_API_BASE_URL` in `.env`.

## Available Scripts

| Command             | Description                                             |
| ------------------- | ------------------------------------------------------- |
| `pnpm dev`          | Start Vite dev server (`--host`)                        |
| `pnpm build`        | Type-check (`tsc -b`) + production build (`vite build`) |
| `pnpm preview`      | Preview production build locally                        |
| `pnpm lint`         | Run ESLint                                              |
| `pnpm format`       | Auto-format with Prettier                               |
| `pnpm format:check` | Check formatting with Prettier                          |
| `pnpm typecheck`    | TypeScript type-checking (`tsc --noEmit`)               |

## Environment Variables

| Variable            | Default | Description     |
| ------------------- | ------- | --------------- |
| `VITE_API_BASE_URL` | `/api`  | Backend API URL |

## Project Structure

```
src/
  main.tsx                    # Entry point (React root)
  App.tsx                     # Root component (routes, providers)
  index.css                   # Global styles + Tailwind + theme CSS variables

  pages/
    LoginPage.tsx             # Login/sign-in page
    ChatPage.tsx              # Main chat page

  components/
    AppLayout.tsx             # Root layout (sidebar + resizable panels)
    ArtifactRenderer.tsx      # Charts, KPI cards, tables (Recharts)
    BrandMark.tsx             # Logo image component
    ChatHeader.tsx            # Conversation header
    ChatInput.tsx             # Message input (textarea, file upload, mode dropdown)
    ChatMessage.tsx           # Single message bubble (rich rendering + actions)
    ChatSidebar.tsx           # Conversation list sidebar
    ChatWindow.tsx            # Scrollable message list
    ErrorBoundary.tsx         # React error boundary (class component)
    FilePreview.tsx           # File attachment previews
    ImageGenLoading.tsx       # Shimmer loading skeleton for image generation
    ImageZoomModal.tsx        # Full-screen image lightbox
    LoginGraphicPanel.tsx     # Decorative login page panel
    MarkdownRenderer.tsx      # Full markdown pipeline (math, diagrams, code, tables)
    Mascot.tsx                # SVG bear mascot (Chattie) with expressions
    ProtectedRoute.tsx        # Auth guard component
    SearchModal.tsx           # Cmd+K conversation search
    SettingsModal.tsx         # User settings dialog
    SidebarItem.tsx           # Single conversation sidebar item
    SlideDeckView.tsx         # Slide deck preview (iframe + fullscreen)
    SlideGenLoading.tsx       # Shimmer skeleton for slide generation
    SlidePipelineStepper.tsx  # Slide generation progress pipeline
    TypingIndicator.tsx       # "Thinking..." animation (rendered inside ChatMessage)
    theme-context.ts          # Theme context (light/dark/system) definition
    theme-provider.tsx        # Theme provider component
    use-theme.ts              # Theme consumer hook
    types.ts                  # Local component type aliases

    ui/                       # shadcn/ui primitive components
      alert-dialog.tsx        # badge.tsx, badge-variants.ts
      button.tsx              # button.tsx, button-variants.ts
      card.tsx, command.tsx, dialog.tsx, dropdown-menu.tsx
      input.tsx, input-group.tsx, label.tsx, popover.tsx
      progress.tsx, resizable.tsx, scroll-area.tsx, select.tsx
      separator.tsx, sheet.tsx, skeleton.tsx, sonner.tsx
      switch.tsx, table.tsx, tabs.tsx, tabs-list-variants.ts
      textarea.tsx, toggle.tsx, toggle-variants.ts, toggle-group.tsx
      tooltip.tsx, avatar.tsx

  stores/
    authStore.ts              # Auth state (login, register, logout, token persistence)
    chatStore.ts              # Chat state (messages, sessions, streaming, feedback)
    settingsStore.ts          # UI settings (language, sidebar collapse)

  lib/
    apiClient.ts              # Axios client + SSE streaming + all API functions
    i18n.ts                   # i18next configuration (en/ja)
    imageStore.ts             # IndexedDB persistence for generated images
    slideStore.ts             # IndexedDB persistence for generated slide decks
    pinnedSessions.ts         # IndexedDB persistence for pinned sessions
    utils.ts                  # cn() utility (clsx + tailwind-merge)

  hooks/
    useChatScroll.ts          # Smart scroll (auto-scroll, MutationObserver, ResizeObserver)

  utils/
    sourceLinks.ts            # Reference link pipeline (strip, render, math sanitize)
    statusMessages.ts         # Japanese-to-translation-key status message mapper

  types/
    index.ts                  # All TypeScript types (requests, responses, SSE, UI state)

  locales/
    en/translation.json       # English translations
    ja/translation.json       # Japanese translations

public/
  favicon.svg                 # App favicon
  vectors/                    # SVG assets (logo, mascot poses, etc.)
```

CVA variant definitions (`button-variants.ts`, `badge-variants.ts`, `tabs-list-variants.ts`, `toggle-variants.ts`) are kept in separate files so the component files remain valid for React Fast Refresh.

## Architecture

### Routing (`App.tsx`)

```
BrowserRouter
  /login          → LoginPage
  /chat/:sessionId? → ChatPage (new chat or active session)
  *                → redirect to /chat
```

All routes except `/login` are wrapped in `<ProtectedRoute>` which redirects to `/login` if no auth token is present. The main layout (`AppLayout`) provides a resizable sidebar (desktop) or sheet sidebar (mobile) wrapping an `<Outlet>`.

### Data Flow

1. **User input** is submitted via `ChatInput` (textarea, file upload, mode selectors) or via suggestion buttons on `ChatPage`. When creating a new chat, `ChatPage` shows a loading overlay with spinner until the backend returns a session ID
2. `chatStore.sendChatMessage()` or `sendRagMessage()` is called
3. The store creates optimistic user + assistant messages and calls `apiClient.chatStream()` / `queryStream()`
4. The SSE parser handles event types: `start`, `title_updated`, `agent_tools`, `artifact`, `image`, `image_status`, `slide`, `slide_status`, `sources`, `done`
5. Text tokens are buffered with adaptive pacing (backlog-aware drip-feed) for smooth streaming. Empty tokens are discarded, and the first non-empty token renders immediately to avoid a blank gap.
6. Zustand state updates trigger React re-renders in `ChatWindow` → `ChatMessage` → `MarkdownRenderer` / `ArtifactRenderer` / `SlideDeckView`

### Authentication

- `LoginPage` supports two modes: AD (Active Directory) and standard username/password
- On success, `authStore` stores `{ user, token }` persisted to localStorage via `zustand/persist`
- Axios interceptor automatically attaches `Bearer` token
- `ProtectedRoute` checks for token and redirects if absent

## Key Features

- **AI Chat with SSE Streaming** — real-time streaming with adaptive token pacing (framer-motion text reveal). TypingIndicator rendered inside the assistant message bubble for seamless transition from "Thinking..." to response content.
- **Rich Markdown Rendering** — GFM, math (KaTeX `$...$` / `$$...$$`), diagrams (Mermaid, PlantUML), code highlighting (highlight.js), auto-linked headings, tables, emoji, inline HTML
- **Data Artifacts** — charts (line, bar, pie, area, scatter, forecast, heatmap via Recharts), KPI cards, data tables
- **Image Generation** — shimmer loading skeleton, zoom modal (keyboard-navigable gallery), download, IndexedDB persistence
- **Slide Deck Generation** — 9-stage pipeline stepper, iframe preview, fullscreen mode, individual slide regeneration, PPTX download, IndexedDB persistence
- **File Upload** — drag-and-drop (react-dropzone), file previews, type/size validation (10MB max)
- **Agent Tools** — expandable agent activity section showing RAG search, web search, company KB search with reasoning
- **Conversation Management** — create, delete, pin/unpin (client-side IndexedDB), search (Cmd+K)
- **Send During Streaming** — textarea stays enabled during streaming so users can compose their next message. The send button is disabled while a response is in progress; pressing send is a no-op. ChatPage shows a "Starting your chat..." overlay when creating a new chat via suggestion buttons
- **Message Actions** — copy, edit & resend, regenerate, thumbs up/down feedback, download as DOCX/MD
- **Bilingual UI** — full English/Japanese localization with automatic language detection
- **Responsive Design** — desktop (resizable sidebar panels) / mobile (drawer sidebar)

## Coding Conventions

- **Functional components** with hooks throughout (one class component: `ErrorBoundary`)
- **TypeScript strict mode** with `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, `erasableSyntaxOnly`
- **Path alias:** `@/` maps to `./src/`
- **i18n:** Translation keys use dot-notation hierarchy (`login.title`, `chat.inputPlaceholder`). Use `useTranslation()` hook.
- **Error handling:** try/catch in async actions, toast notifications via sonner, ErrorBoundary for render errors
- **Prettier:** no semicolons, single quotes, trailing commas, 100 char width
- **ESLint:** flat config with TypeScript-ESLint, react-hooks, react-refresh plugins
- **CVA variants:** Store `cva()` definitions in separate `*-variants.ts` files to keep component exports pure for React Fast Refresh.

## Commit Conventions

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add dark mode toggle
fix: correct login error handling
refactor: extract chat input hook
chore: update dependencies
```

## Pull Requests

1. Fork the repo and create a feature branch from `integration`
2. Make your changes
3. Run `pnpm lint` and `pnpm build`
4. Open a PR with a clear description of what your changes do and why

## API Surface

The app communicates with the backend via `src/lib/apiClient.ts`:

| Method | Endpoint                              | Description                                            |
| ------ | ------------------------------------- | ------------------------------------------------------ |
| POST   | `/login`                              | Standard login                                         |
| POST   | `/login/ad`                           | AD login                                               |
| POST   | `/register`                           | Registration                                           |
| POST   | `/chat/stream`                        | SSE streaming chat (supports file upload via FormData) |
| POST   | `/query/stream`                       | SSE streaming RAG query                                |
| POST   | `/chat/download`                      | Download conversation as DOCX                          |
| GET    | `/sessions`                           | List sessions (paginated)                              |
| GET    | `/sessions/:id`                       | Get session + messages                                 |
| DELETE | `/sessions/:id`                       | Delete session                                         |
| PATCH  | `/sessions/:id`                       | Pin session                                            |
| POST   | `/sessions/:id/messages/truncate`     | Truncate messages                                      |
| POST   | `/messages/:id/feedback`              | Submit thumbs up/down feedback                         |
| POST   | `/slides/:deckId/:slideId/regenerate` | Regenerate a single slide                              |
| GET    | `/user/settings`                      | Get user settings                                      |
| PATCH  | `/user/settings`                      | Update user settings                                   |
| GET    | `/categories`                         | List RAG categories                                    |
| POST   | `/request/cancel/:requestId`          | Cancel active request                                  |
| GET    | `/request/active`                     | List active requests                                   |

Streaming endpoints use Server-Sent Events (SSE) with `event:` and `data:` lines. Event types: `start`, `title_updated`, `agent_tools`, `artifact`, `image`, `image_status`, `slide`, `slide_status`, `sources`, `done`.
