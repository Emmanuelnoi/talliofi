# Talliofi

Your financial life, on your terms. Local-first planning without the account overhead.

[![CI](https://github.com/Emmanuelnoi/talliofi/actions/workflows/ci.yml/badge.svg)](https://github.com/Emmanuelnoi/talliofi/actions/workflows/ci.yml)
![Tests](https://img.shields.io/badge/tests-760%2B-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## Why Talliofi

Most financial apps ask you to hand over your data and hope they keep it safe. Talliofi asks for nothing — your numbers stay on your device.

If you want cloud sync, bring your own Supabase instance. The app works perfectly offline. No login required. No telemetry. No ads.

Built for people who plan seriously and prefer privacy as a default, not a premium feature.

---

## Core Features

**Planning**

- Multi-plan support (scenarios, what-if analysis)
- Income, taxes, expenses, and savings tracking
- Budget templates (50/30/20, envelope method)
- Budget rollover (YNAB-style carry-over)

**Intelligence**

- Net worth snapshots and trend tracking
- Goal tracking with projections
- Interactive reports and drill-down charts
- Split transactions and recurring templates

**Data**

- CSV/OFX import, CSV/JSON/PDF export
- Multi-currency with exchange rate conversion
- Receipt and attachment storage
- Cloud sync (optional, AES-256-GCM encrypted)

**Accessibility**

- Full keyboard navigation with shortcuts
- Skip nav, ARIA live regions, reduced motion
- Responsive design for mobile and desktop

---

## Getting Started

**Run it locally:**

```bash
# Prerequisites: Node 22, pnpm 9+
pnpm install
pnpm run dev
```

Open [http://localhost:5173](http://localhost:5173). Your data lives in your browser — close the tab, come back later, everything's there.

---

## Privacy & Security

- **Local first**: All data stored in IndexedDB. Nothing leaves your device unless you enable sync.
- **Encryption**: Cloud sync uses AES-256-GCM with PBKDF2 key derivation. Data is encrypted before upload.
- **2FA**: TOTP-based two-factor authentication for cloud accounts.
- **No tracking**: No analytics, no telemetry, no ads.
- **Open source**: Review the code yourself. MIT licensed.

---

## For Developers

### Architecture

| Layer     | Tool                                  |
| --------- | ------------------------------------- |
| Framework | React 19 + TypeScript 5.9             |
| Build     | Vite 7                                |
| Styling   | Tailwind CSS v4 + shadcn/ui           |
| Routing   | React Router 7 (lazy-loaded)          |
| Data      | Dexie (IndexedDB) + TanStack Query 5  |
| Forms     | React Hook Form + Zod 4               |
| Charts    | Recharts (lazy-loaded via Suspense)   |
| State     | Zustand (UI only) + nuqs (URL state)  |
| Testing   | Vitest + Testing Library + Playwright |

### Project Structure

```
src/
  domain/        Pure business logic (money, calculations) — no React, no I/O
  data/          Dexie repos, sync engine, encryption
  hooks/         Shared React hooks (TanStack Query wrappers)
  features/      Feature modules (dashboard, expenses, goals, reports, ...)
  components/    Shared UI (shadcn primitives, forms, feedback)
  app/           Shell (providers, router, layout)
  stores/        Zustand (ephemeral UI state only)
```

All financial values use integer cents via a branded `Cents` type. Computations are pure functions in `domain/`. IndexedDB is the single source of truth — TanStack Query caches reads, mutations write back to Dexie.

### Scripts

| Command              | Description                   |
| -------------------- | ----------------------------- |
| `pnpm run dev`       | Dev server with HMR           |
| `pnpm run build`     | Type-check + production build |
| `pnpm run preview`   | Serve production build        |
| `pnpm run lint`      | ESLint check                  |
| `pnpm run format`    | Prettier auto-format          |
| `pnpm run typecheck` | TypeScript check only         |
| `pnpm run test`      | Vitest watch mode             |
| `pnpm run test:run`  | Single run (CI)               |
| `pnpm run test:e2e`  | Playwright headless           |

---

## Contributing

Found a bug? Want a feature? Open an issue or PR.

1. Commits follow [Conventional Commits](https://www.conventionalcommits.org/) — enforced by commitlint.
2. Pre-commit hooks run ESLint + Prettier via lint-staged.
3. CI runs lint, typecheck, unit tests, build, and E2E on every push to `main`.
4. Use `import type` for type-only imports (`verbatimModuleSyntax` is enabled).
5. Financial math goes in `src/domain/` — keep it pure, no React imports.

---

## License

MIT
