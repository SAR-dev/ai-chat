# Contributing to KikuChat

KikuChat is an AI chat application for Mass Holdings Ltd., powered by the "Kikuma v-1.0.0" model. It supports standard chat, RAG queries, image generation, slide deck creation, internet search, and agent-based tool usage — all with streaming responses, rich markdown rendering, and bilingual English/Japanese localization.

## Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | React 19 |
| **Build Tool** | Vite 8 |
| **Language** | TypeScript 6.0 (strict) |
| **Routing** | react-router-dom v7 |
| **State Management** | Zustand 5 |
| **Styling** | Tailwind CSS 4 + shadcn/ui (Base/Lyra) |
| **Animation** | Framer Motion 12 |
| **Icons** | Lucide React + Phosphor Icons |
| **HTTP Client** | Axios |
| **Forms** | react-hook-form + zod |
| **i18n** | react-i18next + i18next-browser-languagedetector |
| **Markdown** | react-markdown + remark/rehype plugins (math, diagrams, syntax highlighting, emoji) |
| **Diagrams** | Mermaid 11 |
| **Charts** | Recharts |
| **Linting** | ESLint 9 + oxlint |
| **Formatting** | Prettier + prettier-plugin-tailwindcss |

## Getting Started

**Prerequisites:** Node.js 20+ and npm.

```bash
npm install
npm run dev        # Starts Vite dev server at http://localhost:5173
```

**Login:** Use `demo@example.com` with any password (the app connects to a real backend at `http://192.168.25.219:81/api` by default).

> **Note:** MSW mock files have been removed. The app communicates directly with the backend API. To point to a different backend, update `VITE_API_BASE_URL` in `.env`.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check (`tsc -b`) + production build (`vite build`) |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run format` | Auto-format with Prettier |
| `npm run format:check` | Check formatting with Prettier |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `/api` | Backend API URL |

## Project Structure

```
src/
  main.tsx                    # Entry point (React root)
  App.tsx                     # Root component (routes, providers)
  index.css                   # Global styles + Tailwind + theme CSS variables

  pages/
    LoginPage.tsx             # Login/sign-in page (AD + standard modes)
    ChatPage.tsx              # Main chat page / home screen

  components/
    AppLayout.tsx             # Root layout (sidebar + resizable panels)
    ArtifactRenderer.tsx      # Charts, KPI cards, tables (Recharts)
    BrandMark.tsx             # Logo image component
    ChatHeader.tsx            # Conversation header (title, rename)
    ChatInput.tsx             # Message input (textarea, file upload, mode dropdown)
    ChatMessage.tsx           # Single message bubble (rich rendering + actions)
    ChatSidebar.tsx           # Conversation list sidebar
    ChatWindow.tsx            # Scrollable message list
    ErrorBoundary.tsx         # React error boundary
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
    TypingIndicator.tsx       # "Thinking..." animation
    theme-provider.tsx        # Theme context (light/dark/system)

    ui/                       # shadcn/ui primitive components (27 files)
      button.tsx, dialog.tsx, dropdown-menu.tsx, input.tsx, ...

  stores/                     # Zustand state stores
    authStore.ts              # Auth state (login, register, logout, token persistence)
    chatStore.ts              # Chat state (messages, sessions, streaming, feedback)
    settingsStore.ts          # UI settings (language, sidebar collapse)

  lib/
    apiClient.ts              # Axios client + SSE streaming + all API functions
    i18n.ts                   # i18next configuration (en/ja)
    imageStore.ts             # IndexedDB persistence for generated images
    utils.ts                  # cn() utility (clsx + tailwind-merge)

  hooks/
    useChatScroll.ts          # Smart scroll (auto-scroll, MutationObserver, ResizeObserver)

  utils/
    sourceLinks.ts            # Reference link pipeline (strip, render, math sanitize)
    statusMessages.ts         # Japanese-to-translation-key status message mapper

  types/
    index.ts                  # All TypeScript types (requests, responses, SSE, UI state)

  locales/
    en/translation.json       # English translations (146 keys)
    ja/translation.json       # Japanese translations (146 keys)
```

## Architecture

### Routing (`App.tsx`)

```
BrowserRouter
  /login          → LoginPage
  /chat           → ChatPage (home, no session selected)
  /chat/:sessionId → ChatPage (active session)
  *                → redirect to /chat
```

All routes except `/login` are wrapped in `<ProtectedRoute>` which redirects to `/login` if no auth token is present. The main layout (`AppLayout`) provides a resizable sidebar (desktop) or sheet sidebar (mobile) wrapping an `<Outlet>`.

### Data Flow

1. **User input** is submitted via `ChatInput` (textarea, file upload, mode selectors)
2. `chatStore.sendChatMessage()` or `sendRagMessage()` is called
3. The store creates optimistic user + assistant messages and calls `apiClient.chatStream()` / `queryStream()`
4. The SSE parser handles event types: `title_updated`, `agent_tools`, `artifact`, `image`, `image_status`, `slide`, `slide_status`, `sources`, `done`
5. Text tokens are buffered with 70ms flush intervals for smooth streaming
6. Zustand state updates trigger React re-renders in `ChatWindow` → `ChatMessage` → `MarkdownRenderer` / `ArtifactRenderer` / `SlideDeckView`

### Authentication

- `LoginPage` supports two modes: AD (Active Directory) and standard username/password
- On success, `authStore` stores `{ user, token }` persisted to localStorage via `zustand/persist`
- Axios interceptor automatically attaches `Bearer` token
- `ProtectedRoute` checks for token and redirects if absent

## Key Features

- **AI Chat with SSE Streaming** — real-time streaming with smooth text reveal (framer-motion)
- **Rich Markdown Rendering** — GFM, math (KaTeX `$...$` / `$$...$$`), diagrams (Mermaid, PlantUML), code highlighting (highlight.js), auto-linked headings, tables, emoji, inline HTML preview
- **Data Artifacts** — charts (line, bar, pie, area, scatter, forecast, heatmap via Recharts), KPI cards, data tables
- **Image Generation** — shimmer loading skeleton, zoom modal (keyboard-navigable gallery), download, IndexedDB persistence
- **Slide Deck Generation** — 9-stage pipeline stepper, iframe preview, fullscreen mode, individual slide regeneration, PPTX download
- **File Upload** — drag-and-drop (react-dropzone), file previews, type/size validation (10MB max)
- **Agent Tools** — expandable agent activity section showing RAG search, web search, company KB search with reasoning
- **Conversation Management** — create, rename, delete, pin/unpin, search (Cmd+K)
- **Message Actions** — copy, edit & resend, regenerate, thumbs up/down feedback, download as DOCX/MD
- **Bilingual UI** — full English/Japanese localization with automatic language detection
- **Responsive Design** — desktop (resizable sidebar panels) / mobile (drawer sidebar)

## Coding Conventions

- **Functional components** with hooks throughout (one class component: `ErrorBoundary`)
- **TypeScript strict mode** with `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, `erasableSyntaxOnly`
- **Path alias:** `@/` maps to `./src/`
- **Barrel imports** from `@/components/ui/`, `@/stores/`, `@/lib/`, `@/types/`
- **i18n:** Translation keys use dot-notation hierarchy (`login.title`, `chat.inputPlaceholder`). Use `useTranslation()` hook.
- **Optimistic updates:** Session creation uses placeholder IDs (`opt-{timestamp}`) replaced server-side on SSE `title_updated` event
- **Error handling:** try/catch in async actions, toast notifications via sonner, ErrorBoundary for render errors
- **Prettier:** no semicolons, single quotes, trailing commas, 100 char width
- **ESLint:** flat config with TypeScript-ESLint, react-hooks, react-refresh plugins

## Adding a shadcn UI Component

```bash
npx shadcn add button
```

All shadcn primitives go in `src/components/ui/`.

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
3. Run `npm run lint` and `npm run build`
4. Open a PR with a clear description of what your changes do and why

## API Surface

The app communicates with the backend via `src/lib/apiClient.ts`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/login` | Standard login |
| POST | `/login/ad` | AD login |
| POST | `/register` | Registration |
| POST | `/chat/stream` | SSE streaming chat (supports file upload via FormData) |
| POST | `/query/stream` | SSE streaming RAG query |
| POST | `/chat/download` | Download conversation as DOCX |
| GET | `/sessions` | List sessions (paginated) |
| GET | `/sessions/:id` | Get session + messages |
| DELETE | `/sessions/:id` | Delete session |
| PATCH | `/sessions/:id` | Rename or pin session |
| POST | `/sessions/:id/messages/truncate` | Truncate messages |
| POST | `/messages/:id/feedback` | Submit thumbs up/down feedback |
| POST | `/slides/:deckId/:slideId/regenerate` | Regenerate a single slide |
| GET | `/user/settings` | Get user settings |
| PATCH | `/user/settings` | Update user settings |
| GET | `/categories` | List RAG categories |
| POST | `/request/cancel/:requestId` | Cancel active request |
| GET | `/request/active` | List active requests |

Streaming endpoints use Server-Sent Events (SSE) with `event:` and `data:` lines. Event types: `title_updated`, `agent_tools`, `artifact`, `image`, `image_status`, `slide`, `slide_status`, `sources`, `done`.
