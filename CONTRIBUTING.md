# Contributing

## Getting Started

```bash
npm install
npm run dev
```

Login with `demo` / `demo1234` (mock backend — see `src/mocks/`).

> **Note:** The sign-in UI is copy-ready for Kiwi/company-credential login, but
> `/api/login` is currently served by MSW mocks against a fake in-memory user
> (`src/mocks/db.ts`). Point `VITE_API_BASE_URL` at the real auth backend and
> remove/disable mocks (`VITE_USE_MOCKS=false`) once Kiwi (or an equivalent
> SSO/LDAP integration) is wired up server-side.

## Code Style

- **ESLint** — `npm run lint` (flat config, `eslint.config.js`)
- **Prettier** — `npm run format` (config in `prettier.config.js`)
- Run both before pushing

## Commit Conventions

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add dark mode toggle
fix: correct login error handling
refactor: extract chat input hook
chore: update dependencies
```

## Project Structure

```
src/
  components/    # UI components (ui/ for shadcn)
  pages/         # Route pages
  stores/        # Zustand stores
  lib/           # Utilities (apiClient, i18n, cn)
  hooks/         # Custom hooks
  locales/       # i18n translations (en, ja)
  types/         # TypeScript types
  mocks/         # MSW handlers + mock DB
```

## Pull Requests

1. Fork the repo and create a feature branch
2. Make your changes
3. Run `npm run lint` and `npm run build`
4. Open a PR with a clear description

## Adding a shadcn Component

```bash
npx shadcn add button
```

All shadcn components go in `src/components/ui/`.
