# Talliofi

A local-first, privacy-focused financial planning web app. Users can plan income, taxes, expenses, and savings buckets entirely in the browser -- no account required, no data leaves the device.

## Tech Stack

| Layer     | Tool                                  |
| --------- | ------------------------------------- |
| Framework | React 19 + TypeScript 5.9             |
| Build     | Vite 7                                |
| Styling   | Tailwind CSS v4 + shadcn/ui           |
| Routing   | React Router 7 (lazy-loaded)          |
| Data      | Dexie (IndexedDB) + TanStack Query 5  |
| Forms     | React Hook Form + Zod 4               |
| Charts    | Recharts (via shadcn chart)           |
| State     | Zustand (UI only)                     |
| Testing   | Vitest + Testing Library + Playwright |

## Architecture

```
src/
  domain/        Pure business logic (money, calculations, rules) -- no React, no I/O
  data/          Dexie repos (single source of truth)
  hooks/         Shared React hooks (TanStack Query wrappers)
  features/      Feature modules (dashboard, income, taxes, buckets, expenses, ...)
  components/    Shared UI (shadcn primitives, form inputs, feedback)
  app/           Shell (providers, router, layout)
  stores/        Zustand (ephemeral UI state only)
```

All financial values use integer cents via a branded `Cents` type. Computations are pure functions. IndexedDB is the single source of truth -- TanStack Query caches reads, mutations write back to Dexie.

## Getting Started

```bash
# Prerequisites: Node 22, pnpm 9+
pnpm install
pnpm run dev          # http://localhost:5173
```

## Scripts

```bash
pnpm run dev          # Dev server with HMR
pnpm run build        # Type-check + production build
pnpm run preview      # Serve production build

pnpm run lint         # ESLint check
pnpm run lint:fix     # ESLint with auto-fix
pnpm run format       # Prettier write
pnpm run format:check # Prettier check
pnpm run typecheck    # TypeScript only

pnpm run test         # Vitest watch mode
pnpm run test:run     # Single run
pnpm run test:coverage # With V8 coverage
pnpm run test:e2e     # Playwright (headless)
pnpm run test:e2e:ui  # Playwright (interactive)
```

## Contributing

1. Commits follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, etc.) -- enforced by commitlint.
2. Pre-commit hooks run ESLint + Prettier via lint-staged.
3. CI runs lint, typecheck, unit tests, build, and e2e on every push to `main`.
4. Use `import type` for type-only imports (`verbatimModuleSyntax` is enabled).
5. Financial math goes in `src/domain/` -- keep it pure, no React imports.

## License

MIT
