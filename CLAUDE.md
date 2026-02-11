# Bilancio - Budget Management App

Personal budget management and cashflow tracking. English codebase and UI.

## Stack

React 19, TypeScript 5.9, Vite 7, React Router 7, TanStack Query, React Hook Form, Zod 4, shadcn/ui (new-york style), Tailwind CSS 4, Lucide React, Supabase (auth + PostgreSQL + RLS), dayjs, recharts

## Structure

- `src/api/` — Supabase queries (documents, payments, cashflow, recurring)
- `src/components/ui/` — shadcn/ui primitives
- `src/components/layout/` — Nav, Shell, ProtectedRoute
- `src/components/documents/` — document-specific components
- `src/components/cashflow/` — cashflow visualization
- `src/hooks/` — React Query hooks (useDocuments, useAuth, useCashflow, etc.)
- `src/lib/` — types, constants (English labels), formatters, supabaseClient, utils
- `src/pages/` — route components (Login, Dashboard, Documents, Cashflow)
- `supabase/migrations/` — database schema and migrations

## Routes

`/login` (public) · `/` Dashboard · `/documents` list · `/documents/new` · `/documents/:id` detail · `/cashflow` — all except login require auth via ProtectedRoute.

## Commands

```bash
npm run dev       # Vite dev server
npm run build     # production build
npm run lint      # ESLint
npx shadcn add [name]  # add shadcn/ui component
```

## Env

`.env.local`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## Conventions

- **Imports**: always use `@/` alias, never relative paths like `../../../`
- **Types**: strict mode, definitions in `@/lib/types.ts`, separate Insert/Update types
- **Components**: functional + TypeScript, forms via React Hook Form + Zod
- **API layer**: all Supabase queries in `src/api/`, async functions with typed returns
- **State**: server state = TanStack Query, auth = useAuth hook, local = useState
- **Styling**: Tailwind utilities, `cn()` for conditionals, dark mode via `dark:` variants
- **Labels**: all user-facing text in English, defined in `@/lib/constants.ts` (KIND_LABELS, STATUS_LABELS, STATUS_COLORS, DIRECTION_LABELS, PAYMENT_METHOD_LABELS)

## Rules for AI

1. Keep API layer separate from components — use React Query hooks
2. Use existing shadcn/ui components and Tailwind patterns
3. All new user-facing text must be in English (add to constants.ts)
4. Database access via Supabase MCP or migrations — never bypass RLS
5. Handle errors gracefully with user-friendly English messages
6. Forms always use React Hook Form + zodResolver

## Do not touch

- `node_modules/`, `dist/`, `.env.local`
- `src/components/ui/` — auto-generated shadcn components
- `supabase/` — modify only via migrations

## Status

- ✅ Core CRUD, auth, payments, cashflow, UI library
- 🔄 Recurring rules (in progress)
- 📋 Dashboard analytics (planned)
