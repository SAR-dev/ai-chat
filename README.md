# KikuChat

A feature-rich AI chat application built with React, TypeScript, and shadcn/ui, powered by Kikuma v-1.0.0.

## Stack

- **Framework:** Vite + React + TypeScript
- **Styling:** Tailwind CSS 4 + shadcn/ui (Base/Lyra)
- **State:** Zustand
- **Routing:** react-router-dom
- **i18n:** react-i18next (English / Japanese)
- **API Mocking:** Mock Service Worker (MSW)
- **Icons:** Phosphor Icons

## Features

- Chat with streaming responses powered by MSW
- Markdown rendering with syntax highlighting
- Math rendering (KaTeX) and diagram support (Mermaid)
- Artifact/code panel viewer
- File upload and preview
- Session management (create, rename, delete conversations)
- Message actions: copy, edit, regenerate, feedback, download
- Cobalt blue color palette
- English/Japanese localization
- Responsive layout (desktop resizable sidebar, mobile drawer)
- Cmd+K command palette for session search

## Getting Started

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173`. Login with `demo@example.com` / any password.

## Environment Variables

See `.env.example`:

| Variable               | Default | Description                           |
| ---------------------- | ------- | ------------------------------------- |
| `VITE_API_BASE_URL`    | `/api`  | Base URL for API requests             |
| `VITE_USE_MOCKS`       | `true`  | Enable MSW mock API                   |
| `VITE_MOCK_LATENCY_MS` | `600`   | Simulated API latency (ms)            |
| `VITE_MOCK_ERROR_RATE` | `0`     | Probability of simulated errors (0-1) |

## Mock API Layer

The app uses MSW to intercept network requests at the Service Worker level. All API calls go through `lib/apiClient.ts` which talks to "endpoints" just like a real backend. To swap to a real backend:

1. Set `VITE_API_BASE_URL` to your backend URL
2. Set `VITE_USE_MOCKS=false`
3. Remove/retire the `mocks/` directory

## Project Structure

```
src/
  components/    # UI components
    ui/          # shadcn/ui generated components
  pages/         # Route pages
  stores/        # Zustand stores (auth, chat, settings)
  lib/           # Utilities (apiClient, i18n, cn)
  hooks/         # Custom hooks
  locales/       # i18n translations (en, ja)
  types/         # TypeScript types
  mocks/         # MSW handlers and mock database
```

## Scripts

- `npm run dev` - Start dev server
- `npm run build` - TypeScript check + production build
- `npm run preview` - Preview production build
