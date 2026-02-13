# Talliofi - Production Implementation Plan

> A local-first, privacy-focused financial planning web app that helps users understand their income, taxes, expenses, savings, and monthly trends — without requiring an account or sending data to the cloud.

## Table of Contents

1. [Project Vision](#project-vision)
2. [Core Principles](#core-principles)
3. [Tech Stack](#tech-stack)
4. [Architecture Overview](#architecture-overview)
5. [State Management Strategy](#state-management-strategy)
6. [User Journey](#user-journey)
7. [Phase 1: Domain Engine + Data Layer](#phase-1-domain-engine--data-layer)
8. [Phase 2: App Shell + Routing + Onboarding](#phase-2-app-shell--routing--onboarding)
9. [Phase 3: Feature Pages](#phase-3-feature-pages)
10. [Phase 4: Dashboard + Charts](#phase-4-dashboard--charts)
11. [Phase 5: History + Snapshots](#phase-5-history--snapshots)
12. [Phase 6: Settings + Export/Import](#phase-6-settings--exportimport)
13. [Post-MVP: Cloud Sync](#post-mvp-cloud-sync)
14. [Testing Strategy](#testing-strategy)
15. [Security Checklist](#security-checklist)

---

## Project Vision

Talliofi is designed for users who value clarity, control, and privacy in personal finance. All data is stored locally in the browser (IndexedDB) by default, making it fully offline-capable. Users can optionally enable cloud sync via Supabase with explicit opt-in.

### Core Capabilities

- Enter income (weekly, bi-weekly, or monthly) and estimate take-home pay after tax
- Allocate money into customizable buckets (percentage or fixed amount)
- Track categorized expenses with flexible cadences
- Visual dashboards with charts, trends, and rolling averages
- Monthly snapshots to track spending direction over time
- Clear "budget vs actual" insights and guardrails
- Export/import data for full user ownership

---

## Core Principles

| Principle               | Implementation                                           |
| ----------------------- | -------------------------------------------------------- |
| **Local-first**         | IndexedDB via Dexie — works offline, no server required  |
| **Privacy-first**       | No tracking, no analytics, no third-party scripts        |
| **No account required** | Fully functional without sign-up or authentication       |
| **Money integrity**     | Integer cents (branded type), never floating-point       |
| **Computed on demand**  | Rolling averages and summaries are derived, never stored |
| **Type safety**         | TypeScript strict mode + Zod validation at boundaries    |
| **Deterministic**       | Pure domain logic with no side effects — fully testable  |

---

## Tech Stack

| Layer           | Tool                                          | Purpose                                                |
| --------------- | --------------------------------------------- | ------------------------------------------------------ |
| Framework       | React 19 + TypeScript 5.9                     | UI rendering + type safety                             |
| Build           | Vite 7                                        | Dev server, HMR, production builds                     |
| Styling         | Tailwind CSS v4 + shadcn/ui                   | Utility CSS + accessible component primitives          |
| Routing         | React Router 7                                | Client-side navigation with lazy loading               |
| Async data      | TanStack Query 5                              | Cache, loading/error states, mutations for Dexie       |
| UI state        | Zustand                                       | Ephemeral UI state only (no persistence)               |
| Forms           | React Hook Form + @hookform/resolvers + Zod 4 | Validation, dirty tracking, error messages             |
| URL state       | nuqs                                          | Type-safe URL search params (filters, date ranges)     |
| Database        | Dexie (IndexedDB)                             | Single source of truth for all user data               |
| Icons           | Lucide React                                  | Icon library (shadcn default)                          |
| Charts          | shadcn chart components                       | Themed Recharts wrappers                               |
| Testing         | Vitest + Testing Library + Playwright         | Unit, integration, E2E                                 |
| Sync (post-MVP) | Supabase                                      | Tier 2: direct storage with RLS; Tier 3: E2E encrypted |

### Dependencies to Install

```bash
# Data layer + UI state
pnpm add dexie zustand

# Form integration (connects React Hook Form to Zod)
pnpm add @hookform/resolvers

# Charts (via shadcn — installs recharts internally)
pnpm dlx shadcn@latest add chart
```

Already installed: `react`, `react-dom`, `react-router`, `@tanstack/react-query`, `react-hook-form`, `zod`, `nuqs`, `tailwindcss`, `clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react`.

Not needed until post-MVP: `@supabase/supabase-js`.

---

## Architecture Overview

### Folder Structure

```
src/
├── app/                          # App shell — wires everything together
│   ├── providers.tsx             # QueryClientProvider, RouterProvider
│   ├── router.tsx                # Route tree with lazy imports
│   └── layout.tsx                # Shell layout (sidebar + main content)
│
├── features/                     # Self-contained feature modules
│   ├── onboarding/
│   │   ├── components/
│   │   │   ├── income-step.tsx
│   │   │   ├── tax-step.tsx
│   │   │   ├── buckets-step.tsx
│   │   │   └── expenses-step.tsx
│   │   ├── hooks/
│   │   │   └── use-onboarding.ts
│   │   ├── pages/
│   │   │   └── onboarding-page.tsx
│   │   └── index.ts              # Public barrel export
│   │
│   ├── dashboard/
│   │   ├── components/
│   │   │   ├── income-summary-card.tsx
│   │   │   ├── bucket-donut-chart.tsx
│   │   │   ├── expense-trend-chart.tsx
│   │   │   ├── alerts-panel.tsx
│   │   │   └── key-numbers-grid.tsx
│   │   ├── hooks/
│   │   │   └── use-plan-summary.ts
│   │   ├── pages/
│   │   │   └── dashboard-page.tsx
│   │   └── index.ts
│   │
│   ├── income/
│   │   ├── components/
│   │   │   └── income-form.tsx
│   │   ├── hooks/
│   │   │   ├── use-plan-income.ts
│   │   │   └── use-update-income.ts
│   │   ├── pages/
│   │   │   └── income-page.tsx
│   │   └── index.ts
│   │
│   ├── taxes/
│   │   ├── components/
│   │   │   ├── tax-form.tsx
│   │   │   └── tax-breakdown.tsx
│   │   ├── hooks/
│   │   ├── pages/
│   │   │   └── taxes-page.tsx
│   │   └── index.ts
│   │
│   ├── buckets/
│   │   ├── components/
│   │   │   ├── bucket-list.tsx
│   │   │   ├── bucket-form.tsx
│   │   │   └── allocation-bar.tsx
│   │   ├── hooks/
│   │   ├── pages/
│   │   │   └── buckets-page.tsx
│   │   └── index.ts
│   │
│   ├── expenses/
│   │   ├── components/
│   │   │   ├── expense-list.tsx
│   │   │   ├── expense-form.tsx
│   │   │   ├── expense-filters.tsx
│   │   │   └── expense-row.tsx
│   │   ├── hooks/
│   │   │   ├── use-expenses.ts
│   │   │   └── use-expense-mutations.ts
│   │   ├── pages/
│   │   │   └── expenses-page.tsx
│   │   └── index.ts
│   │
│   ├── history/
│   │   ├── components/
│   │   │   ├── snapshot-list.tsx
│   │   │   ├── trend-chart.tsx
│   │   │   └── month-comparison.tsx
│   │   ├── hooks/
│   │   │   ├── use-snapshots.ts
│   │   │   └── use-rolling-averages.ts
│   │   ├── pages/
│   │   │   └── history-page.tsx
│   │   └── index.ts
│   │
│   └── settings/
│       ├── components/
│       │   ├── export-section.tsx
│       │   ├── import-section.tsx
│       │   ├── theme-toggle.tsx
│       │   └── danger-zone.tsx
│       ├── pages/
│       │   └── settings-page.tsx
│       └── index.ts
│
├── domain/                       # Pure business logic — no React, no I/O
│   ├── money/
│   │   ├── money.ts
│   │   ├── money.test.ts
│   │   └── index.ts
│   └── plan/
│       ├── types.ts
│       ├── schemas.ts
│       ├── calc.ts
│       ├── normalize.ts
│       ├── rules.ts
│       ├── snapshot.ts
│       ├── calc.test.ts
│       ├── normalize.test.ts
│       ├── rules.test.ts
│       └── index.ts
│
├── data/
│   ├── db.ts                     # Dexie schema + migrations
│   ├── repos/
│   │   ├── plan-repo.ts
│   │   ├── bucket-repo.ts
│   │   ├── expense-repo.ts
│   │   ├── tax-component-repo.ts
│   │   ├── snapshot-repo.ts
│   │   └── changelog-repo.ts
│   └── export/
│       ├── export-service.ts
│       └── import-service.ts
│
├── components/                   # Shared UI (aligns with shadcn defaults)
│   ├── ui/                       # shadcn primitives (Button, Card, Input, etc.)
│   ├── forms/
│   │   ├── money-input.tsx
│   │   └── percent-input.tsx
│   ├── feedback/
│   │   ├── empty-state.tsx
│   │   ├── error-boundary.tsx
│   │   └── save-indicator.tsx
│   └── layout/
│       ├── page-header.tsx
│       └── sidebar-nav.tsx
│
├── hooks/                        # Shared hooks
│   ├── use-active-plan.ts        # Which plan is current
│   ├── use-debounce.ts
│   └── use-auto-save.ts
│
├── lib/                          # Shared utilities
│   ├── utils.ts                  # cn() — already exists
│   ├── constants.ts
│   └── query-client.ts           # TanStack Query client config
│
├── stores/
│   └── ui-store.ts               # Zustand — ephemeral UI state only
│
├── main.tsx
└── index.css
```

### Import Rules

These boundaries keep the architecture clean and prevent circular dependencies:

| Module         | Can import from                                                                                                 | Cannot import from                  |
| -------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `domain/*`     | Nothing (pure logic)                                                                                            | React, data, features, components   |
| `data/*`       | `domain/*`, `lib/*`                                                                                             | React, features, components, stores |
| `components/*` | `lib/*`                                                                                                         | domain, data, features, stores      |
| `hooks/*`      | `domain/*`, `data/*`, `lib/*`, `stores/*`                                                                       | features                            |
| `features/*`   | `domain/*`, `data/*`, `components/*`, `hooks/*`, `lib/*`, `stores/*`, other `features/*/index.ts` (barrel only) | Other features' internal files      |
| `app/*`        | Everything                                                                                                      | —                                   |

---

## State Management Strategy

### The Problem with the Previous Approach

The original plan used Zustand with `persist` middleware writing to `localStorage`, while also having Dexie for IndexedDB. Two persistence layers = two sources of truth that drift apart.

### The Correct Architecture

```
┌─────────────────────────────────────────────────┐
│                    React UI                      │
│                                                  │
│  ┌──────────────┐  ┌───────────┐  ┌───────────┐ │
│  │ TanStack     │  │ Zustand   │  │ nuqs      │ │
│  │ Query        │  │ (UI only) │  │ (URL)     │ │
│  │              │  │           │  │           │ │
│  │ Plan data    │  │ Sidebar   │  │ Filters   │ │
│  │ Expenses     │  │ Modals    │  │ Sort      │ │
│  │ Snapshots    │  │ Onboard   │  │ Date range│ │
│  │ Summaries    │  │ step      │  │           │ │
│  └──────┬───────┘  └───────────┘  └───────────┘ │
│         │                                        │
│         │ useQuery / useMutation                  │
│         ▼                                        │
│  ┌──────────────┐                                │
│  │ Dexie Repos  │  ← Single source of truth      │
│  │ (IndexedDB)  │                                │
│  └──────────────┘                                │
└─────────────────────────────────────────────────┘
```

| Layer                | Tool                     | What lives here                                                  |
| -------------------- | ------------------------ | ---------------------------------------------------------------- |
| **Persistent data**  | Dexie (IndexedDB)        | Plans, expenses, buckets, snapshots, settings                    |
| **Async data cache** | TanStack Query           | Reads from Dexie, caches in memory, handles loading/error states |
| **Mutations**        | TanStack Query mutations | Writes to Dexie, invalidates queries, enables optimistic updates |
| **Ephemeral UI**     | Zustand (no persist)     | Sidebar open/closed, active modal, onboarding step, save status  |
| **URL state**        | nuqs                     | Active date range, expense filters, sort order                   |
| **Form state**       | React Hook Form + Zod    | Form values, validation, dirty tracking                          |

### Example: Reading and Writing Plan Data

```typescript
// hooks/use-active-plan.ts — plan record only (lightweight)
import { useQuery } from '@tanstack/react-query';
import { planRepo } from '@/data/repos/plan-repo';

export function useActivePlan() {
  return useQuery({
    queryKey: ['active-plan'],
    queryFn: () => planRepo.getActive(),
  });
}

// features/expenses/hooks/use-expenses.ts — separate query
import { useQuery } from '@tanstack/react-query';
import { expenseRepo } from '@/data/repos/expense-repo';

export function useExpenses(planId: string) {
  return useQuery({
    queryKey: ['expenses', planId],
    queryFn: () => expenseRepo.getByPlanId(planId),
    enabled: !!planId,
  });
}

// features/expenses/hooks/use-expense-mutations.ts — granular mutations
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseRepo } from '@/data/repos/expense-repo';

export function useCreateExpense(planId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: expenseRepo.create,
    onSuccess: () => {
      // Only invalidates the expenses query, not the entire plan
      queryClient.invalidateQueries({ queryKey: ['expenses', planId] });
    },
  });
}
```

### Zustand: UI State Only

```typescript
// stores/ui-store.ts
import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  setSaveStatus: (status: UIState['saveStatus']) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  saveStatus: 'idle',
  setSaveStatus: (saveStatus) => set({ saveStatus }),
}));
```

---

## User Journey

### First Visit

```
User opens talliofi.app
    │
    ▼
Has plan in IndexedDB? ──No──▶ /onboarding
    │                              │
   Yes                    Step 1: Income
    │                     Step 2: Taxes
    ▼                     Step 3: Buckets
/dashboard                Step 4: First expenses (optional)
                          Step 5: Summary → /dashboard
```

### Route Structure

```
/                     → Redirect to /dashboard or /onboarding
/onboarding           → Guided setup wizard
/dashboard            → Summary, charts, alerts
/income               → Income configuration
/taxes                → Tax rate configuration
/expenses             → Expense list, add/edit/delete
/buckets              → Bucket allocation management
/history              → Monthly snapshots, trends
/settings             → Export, import, theme, danger zone
```

All feature pages are lazy-loaded via `React.lazy()` / `route.lazy` for optimal bundle splitting.

### Navigation

Sidebar on desktop (collapsible), bottom tabs on mobile:

- Dashboard (LayoutDashboard icon)
- Income (DollarSign icon)
- Expenses (Receipt icon)
- Buckets (PieChart icon)
- History (TrendingUp icon)
- Settings (Settings icon)

---

## Phase 1: Domain Engine + Data Layer

### 1.1 Money Module

**`src/domain/money/money.ts`**

```typescript
/**
 * Money is represented as integer cents to avoid floating-point issues.
 * Branded type prevents accidental mixing with regular numbers.
 */
export type Cents = number & { readonly __brand: 'Cents' };

export function cents(value: number): Cents {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`Invalid cents value: ${value}`);
  }
  return value as Cents;
}

export function dollarsToCents(dollars: number): Cents {
  return cents(Math.round(dollars * 100));
}

export function centsToDollars(amount: Cents): number {
  return amount / 100;
}

export function formatMoney(
  amount: Cents,
  options: { locale?: string; currency?: string } = {},
): string {
  const { locale = 'en-US', currency = 'USD' } = options;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(centsToDollars(amount));
}

// Arithmetic
export const addMoney = (a: Cents, b: Cents): Cents => cents(a + b);
export const subtractMoney = (a: Cents, b: Cents): Cents => cents(a - b);
export const multiplyMoney = (amount: Cents, factor: number): Cents =>
  cents(Math.round(amount * factor));
export const divideMoney = (amount: Cents, divisor: number): Cents =>
  cents(Math.round(amount / divisor));
export const percentOf = (amount: Cents, percent: number): Cents =>
  cents(Math.round(amount * (percent / 100)));
export const sumMoney = (amounts: readonly Cents[]): Cents =>
  amounts.reduce((sum, amt) => addMoney(sum, amt), cents(0));
```

### 1.2 Frequency Normalization

**`src/domain/plan/normalize.ts`**

```typescript
import type { Cents } from '@/domain/money';
import { multiplyMoney } from '@/domain/money';

export type Frequency =
  | 'weekly'
  | 'biweekly'
  | 'semimonthly'
  | 'monthly'
  | 'quarterly'
  | 'annual';

const MONTHLY_FACTORS: Record<Frequency, number> = {
  weekly: 52 / 12,
  biweekly: 26 / 12,
  semimonthly: 2,
  monthly: 1,
  quarterly: 1 / 3,
  annual: 1 / 12,
};

export function normalizeToMonthly(amount: Cents, frequency: Frequency): Cents {
  return multiplyMoney(amount, MONTHLY_FACTORS[frequency]);
}

export function denormalizeFromMonthly(
  monthlyAmount: Cents,
  targetFrequency: Frequency,
): Cents {
  return multiplyMoney(monthlyAmount, 1 / MONTHLY_FACTORS[targetFrequency]);
}
```

### 1.3 Core Types

**`src/domain/plan/types.ts`**

```typescript
import type { Cents } from '@/domain/money';
import type { Frequency } from './normalize';

// --- Expense Categories ---

export type ExpenseCategory =
  | 'housing'
  | 'utilities'
  | 'transportation'
  | 'groceries'
  | 'healthcare'
  | 'insurance'
  | 'debt_payment'
  | 'savings'
  | 'entertainment'
  | 'dining'
  | 'personal'
  | 'subscriptions'
  | 'other';

// --- Plan (lightweight root record) ---

export interface Plan {
  readonly id: string;
  readonly name: string;
  readonly grossIncomeCents: Cents;
  readonly incomeFrequency: Frequency;
  readonly taxMode: 'simple' | 'itemized';
  readonly taxEffectiveRate?: number; // 0-100, used when taxMode === 'simple'
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly version: number;
}

// --- Bucket Allocation (separate table) ---

export interface BucketAllocation {
  readonly id: string;
  readonly planId: string;
  readonly name: string;
  readonly color: string;
  readonly mode: 'percentage' | 'fixed';
  readonly targetPercentage?: number; // 0-100, used when mode === 'percentage'
  readonly targetAmountCents?: Cents; // used when mode === 'fixed'
  readonly sortOrder: number;
  readonly createdAt: string;
}

// --- Tax Component (separate table, for itemized mode) ---

export interface TaxComponent {
  readonly id: string;
  readonly planId: string;
  readonly name: string; // "Federal", "State", "FICA", etc.
  readonly ratePercent: number;
  readonly sortOrder: number;
}

// --- Expense Item (separate table) ---

export interface ExpenseItem {
  readonly id: string;
  readonly planId: string;
  readonly bucketId: string; // references BucketAllocation.id
  readonly name: string;
  readonly amountCents: Cents;
  readonly frequency: Frequency;
  readonly category: ExpenseCategory;
  readonly isFixed: boolean;
  readonly notes?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

// --- Monthly Snapshot ---

export interface MonthlySnapshot {
  readonly id: string;
  readonly planId: string;
  readonly yearMonth: string; // "2026-01"
  readonly grossIncomeCents: Cents;
  readonly netIncomeCents: Cents;
  readonly totalExpensesCents: Cents;
  readonly bucketSummaries: readonly BucketSummary[];
  readonly createdAt: string;
}

export interface BucketSummary {
  readonly bucketId: string;
  readonly bucketName: string;
  readonly allocatedCents: Cents;
  readonly spentCents: Cents;
  readonly remainingCents: Cents;
}

// --- Computed Summaries (never stored) ---

export interface BudgetAlert {
  readonly severity: 'info' | 'warning' | 'error';
  readonly code: string;
  readonly message: string;
  readonly relatedEntityId?: string;
}

export interface PlanSummary {
  readonly planId: string;
  readonly yearMonth: string;
  readonly grossMonthlyIncome: Cents;
  readonly estimatedTax: Cents;
  readonly netMonthlyIncome: Cents;
  readonly totalMonthlyExpenses: Cents;
  readonly expensesByCategory: ReadonlyMap<ExpenseCategory, Cents>;
  readonly expensesByBucket: ReadonlyMap<string, Cents>;
  readonly bucketAnalysis: readonly BucketAnalysis[];
  readonly surplusOrDeficit: Cents;
  readonly savingsRate: number;
  readonly alerts: readonly BudgetAlert[];
}

export interface BucketAnalysis {
  readonly bucketId: string;
  readonly bucketName: string;
  readonly targetPercentage: number;
  readonly actualPercentage: number;
  readonly targetAmountCents: Cents;
  readonly actualAmountCents: Cents;
  readonly varianceCents: Cents;
  readonly status: 'under' | 'on_target' | 'over';
}

export interface RollingAverages {
  readonly monthsIncluded: number;
  readonly avgTotalExpenses: Cents;
  readonly trend: 'increasing' | 'decreasing' | 'stable';
}

// --- Change Log (for future sync) ---

export interface ChangeLogEntry {
  readonly id: string;
  readonly planId: string;
  readonly entityType:
    | 'plan'
    | 'expense'
    | 'bucket'
    | 'tax_component'
    | 'snapshot';
  readonly entityId: string;
  readonly operation: 'create' | 'update' | 'delete';
  readonly timestamp: string;
  readonly payload?: string;
}
```

### 1.4 Zod Schemas

**`src/domain/plan/schemas.ts`**

Note: Uses Zod v4 syntax. Schemas validate at system boundaries (form submission, import, database reads).

```typescript
import { z } from 'zod';

export const CentsSchema = z.number().int().safe();

export const FrequencySchema = z.enum([
  'weekly',
  'biweekly',
  'semimonthly',
  'monthly',
  'quarterly',
  'annual',
]);

export const ExpenseCategorySchema = z.enum([
  'housing',
  'utilities',
  'transportation',
  'groceries',
  'healthcare',
  'insurance',
  'debt_payment',
  'savings',
  'entertainment',
  'dining',
  'personal',
  'subscriptions',
  'other',
]);

// --- Record Schemas (one per Dexie table) ---

export const PlanSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  grossIncomeCents: CentsSchema.nonnegative(),
  incomeFrequency: FrequencySchema,
  taxMode: z.enum(['simple', 'itemized']),
  taxEffectiveRate: z.number().min(0).max(100).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  version: z.number().int().nonnegative(),
});

export const BucketAllocationSchema = z
  .object({
    id: z.string().uuid(),
    planId: z.string().uuid(),
    name: z.string().min(1).max(50),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    mode: z.enum(['percentage', 'fixed']),
    targetPercentage: z.number().min(0).max(100).optional(),
    targetAmountCents: CentsSchema.nonnegative().optional(),
    sortOrder: z.number().int().nonnegative(),
    createdAt: z.string().datetime(),
  })
  .refine(
    (b) =>
      b.mode === 'percentage'
        ? b.targetPercentage !== undefined
        : b.targetAmountCents !== undefined,
    {
      message:
        'Must provide targetPercentage or targetAmountCents based on mode',
    },
  );

export const TaxComponentSchema = z.object({
  id: z.string().uuid(),
  planId: z.string().uuid(),
  name: z.string().min(1).max(50),
  ratePercent: z.number().min(0).max(100),
  sortOrder: z.number().int().nonnegative(),
});

export const ExpenseItemSchema = z.object({
  id: z.string().uuid(),
  planId: z.string().uuid(),
  bucketId: z.string().uuid(),
  name: z.string().min(1).max(100),
  amountCents: CentsSchema.nonnegative(),
  frequency: FrequencySchema,
  category: ExpenseCategorySchema,
  isFixed: z.boolean(),
  notes: z.string().max(500).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// --- Form Input Schemas ---

export const IncomeInputSchema = z.object({
  grossIncomeDollars: z.number().positive(),
  incomeFrequency: FrequencySchema,
});

export const TaxSimpleInputSchema = z.object({
  effectiveRate: z.number().min(0).max(100),
});

export const TaxComponentInputSchema = z.object({
  name: z.string().min(1).max(50),
  ratePercent: z.number().min(0).max(100),
});

export const BucketInputSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  mode: z.enum(['percentage', 'fixed']),
  targetPercentage: z.number().min(0).max(100).optional(),
  targetAmountDollars: z.number().nonnegative().optional(),
});

export const CreateExpenseInputSchema = z.object({
  name: z.string().min(1).max(100),
  amountDollars: z.number().positive(),
  frequency: FrequencySchema,
  category: ExpenseCategorySchema,
  bucketId: z.string().uuid(),
  isFixed: z.boolean().default(false),
  notes: z.string().max(500).optional(),
});

// --- Export Schema (for import validation) ---

export const ExportSchema = z.object({
  version: z.number().int().positive(),
  exportedAt: z.string().datetime(),
  plan: PlanSchema,
  buckets: z.array(BucketAllocationSchema),
  taxComponents: z.array(TaxComponentSchema),
  expenses: z.array(ExpenseItemSchema),
  snapshots: z.array(
    z.object({
      id: z.string().uuid(),
      planId: z.string().uuid(),
      yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
      grossIncomeCents: CentsSchema,
      netIncomeCents: CentsSchema,
      totalExpensesCents: CentsSchema,
      bucketSummaries: z.array(
        z.object({
          bucketId: z.string(),
          bucketName: z.string(),
          allocatedCents: CentsSchema,
          spentCents: CentsSchema,
          remainingCents: CentsSchema,
        }),
      ),
      createdAt: z.string().datetime(),
    }),
  ),
});
```

### 1.5 Calculation Engine

**`src/domain/plan/calc.ts`**

```typescript
import type {
  Plan,
  PlanSummary,
  BucketAnalysis,
  BucketAllocation,
  ExpenseCategory,
  ExpenseItem,
  TaxComponent,
} from './types';
import type { Cents } from '@/domain/money';
import {
  cents,
  subtractMoney,
  percentOf,
  sumMoney,
  addMoney,
} from '@/domain/money';
import { normalizeToMonthly } from './normalize';
import { generateAlerts } from './rules';

export interface PlanComputeInput {
  plan: Plan;
  buckets: readonly BucketAllocation[];
  expenses: readonly ExpenseItem[];
  taxComponents: readonly TaxComponent[];
}

export function computePlanSummary(
  input: PlanComputeInput,
  yearMonth?: string,
): PlanSummary {
  const { plan, buckets, expenses, taxComponents } = input;
  const currentYearMonth = yearMonth ?? getCurrentYearMonth();

  // 1. Monthly income
  const grossMonthlyIncome = normalizeToMonthly(
    plan.grossIncomeCents,
    plan.incomeFrequency,
  );

  // 2. Tax
  const estimatedTax = computeTax(grossMonthlyIncome, plan, taxComponents);
  const netMonthlyIncome = subtractMoney(grossMonthlyIncome, estimatedTax);

  // 3. Aggregate expenses
  const { totalMonthlyExpenses, expensesByCategory, expensesByBucket } =
    aggregateExpenses(expenses);

  // 4. Bucket analysis
  const bucketAnalysis = computeBucketAnalysis(
    buckets,
    expensesByBucket,
    netMonthlyIncome,
  );

  // 5. Bottom line
  const surplusOrDeficit = subtractMoney(
    netMonthlyIncome,
    totalMonthlyExpenses,
  );
  const savingsRate =
    netMonthlyIncome > 0 ? (surplusOrDeficit / netMonthlyIncome) * 100 : 0;

  // 6. Alerts
  const alerts = generateAlerts({
    plan,
    buckets,
    netMonthlyIncome,
    totalMonthlyExpenses,
    bucketAnalysis,
    surplusOrDeficit,
  });

  return {
    planId: plan.id,
    yearMonth: currentYearMonth,
    grossMonthlyIncome,
    estimatedTax,
    netMonthlyIncome,
    totalMonthlyExpenses,
    expensesByCategory,
    expensesByBucket,
    bucketAnalysis,
    surplusOrDeficit,
    savingsRate,
    alerts,
  };
}

export function computeTax(
  grossMonthly: Cents,
  plan: Plan,
  taxComponents: readonly TaxComponent[],
): Cents {
  if (plan.taxMode === 'simple') {
    return percentOf(grossMonthly, plan.taxEffectiveRate ?? 0);
  }

  const totalRate = taxComponents.reduce((sum, c) => sum + c.ratePercent, 0);
  return percentOf(grossMonthly, totalRate);
}

function aggregateExpenses(expenses: readonly ExpenseItem[]) {
  const byCategory = new Map<ExpenseCategory, Cents>();
  const byBucket = new Map<string, Cents>();
  let total = cents(0);

  for (const expense of expenses) {
    const monthly = normalizeToMonthly(expense.amountCents, expense.frequency);
    total = addMoney(total, monthly);

    const catCurrent = byCategory.get(expense.category) ?? cents(0);
    byCategory.set(expense.category, addMoney(catCurrent, monthly));

    const bucketCurrent = byBucket.get(expense.bucketId) ?? cents(0);
    byBucket.set(expense.bucketId, addMoney(bucketCurrent, monthly));
  }

  return {
    totalMonthlyExpenses: total,
    expensesByCategory: byCategory,
    expensesByBucket: byBucket,
  };
}

function computeBucketAnalysis(
  allocations: readonly BucketAllocation[],
  actualByBucket: ReadonlyMap<string, Cents>,
  netMonthlyIncome: Cents,
): readonly BucketAnalysis[] {
  return allocations.map((allocation) => {
    const targetAmountCents =
      allocation.mode === 'percentage'
        ? percentOf(netMonthlyIncome, allocation.targetPercentage ?? 0)
        : (allocation.targetAmountCents ?? cents(0));

    const targetPercentage =
      allocation.mode === 'percentage'
        ? (allocation.targetPercentage ?? 0)
        : netMonthlyIncome > 0
          ? ((allocation.targetAmountCents ?? 0) / netMonthlyIncome) * 100
          : 0;

    const actualAmountCents = actualByBucket.get(allocation.id) ?? cents(0);

    const varianceCents = subtractMoney(targetAmountCents, actualAmountCents);

    const actualPercentage =
      netMonthlyIncome > 0 ? (actualAmountCents / netMonthlyIncome) * 100 : 0;

    const variancePercent =
      targetPercentage > 0
        ? ((targetPercentage - actualPercentage) / targetPercentage) * 100
        : 0;

    const status: 'under' | 'on_target' | 'over' =
      variancePercent > 5
        ? 'under'
        : variancePercent < -5
          ? 'over'
          : 'on_target';

    return {
      bucketId: allocation.id,
      bucketName: allocation.name,
      targetPercentage,
      actualPercentage,
      targetAmountCents,
      actualAmountCents,
      varianceCents,
      status,
    };
  });
}

function getCurrentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
```

### 1.6 Budget Rules and Alerts

**`src/domain/plan/rules.ts`**

```typescript
import type {
  Plan,
  BucketAllocation,
  BucketAnalysis,
  BudgetAlert,
} from './types';
import type { Cents } from '@/domain/money';
import { centsToDollars } from '@/domain/money';

interface AlertContext {
  plan: Plan;
  buckets: readonly BucketAllocation[];
  netMonthlyIncome: Cents;
  totalMonthlyExpenses: Cents;
  bucketAnalysis: readonly BucketAnalysis[];
  surplusOrDeficit: Cents;
}

export function generateAlerts(context: AlertContext): readonly BudgetAlert[] {
  const alerts: BudgetAlert[] = [];

  // Bucket overages
  for (const bucket of context.bucketAnalysis) {
    if (bucket.status === 'over') {
      const overPercent = Math.abs(
        ((bucket.actualPercentage - bucket.targetPercentage) /
          bucket.targetPercentage) *
          100,
      );
      alerts.push({
        severity: overPercent > 20 ? 'error' : 'warning',
        code: 'BUCKET_OVER_BUDGET',
        message: `${bucket.bucketName} is ${overPercent.toFixed(1)}% over budget`,
        relatedEntityId: bucket.bucketId,
      });
    }
  }

  // Budget deficit
  if (context.surplusOrDeficit < 0) {
    const deficit = Math.abs(context.surplusOrDeficit) as Cents;
    const deficitPercent =
      context.netMonthlyIncome > 0
        ? (deficit / context.netMonthlyIncome) * 100
        : 100;
    alerts.push({
      severity: deficitPercent > 10 ? 'error' : 'warning',
      code: 'BUDGET_DEFICIT',
      message: `Monthly spending exceeds income by ${centsToDollars(deficit).toFixed(2)}`,
    });
  }

  // Percentage allocations exceed 100%
  const percentBuckets = context.buckets.filter((b) => b.mode === 'percentage');
  const totalAllocation = percentBuckets.reduce(
    (sum, b) => sum + (b.targetPercentage ?? 0),
    0,
  );
  if (totalAllocation > 100) {
    alerts.push({
      severity: 'error',
      code: 'ALLOCATIONS_EXCEED_100',
      message: `Percentage allocations total ${totalAllocation.toFixed(1)}% — exceeds 100%`,
    });
  }

  // No savings bucket
  const hasSavingsBucket = context.bucketAnalysis.some((b) =>
    b.bucketName.toLowerCase().includes('saving'),
  );
  if (!hasSavingsBucket) {
    alerts.push({
      severity: 'info',
      code: 'NO_SAVINGS_BUCKET',
      message: 'Consider adding a savings bucket to track savings goals',
    });
  }

  return alerts;
}
```

### 1.7 Dexie Database

**`src/data/db.ts`**

```typescript
import Dexie, { type Table } from 'dexie';
import type {
  Plan,
  BucketAllocation,
  TaxComponent,
  ExpenseItem,
  MonthlySnapshot,
  ChangeLogEntry,
} from '@/domain/plan/types';

export class TalliofiDatabase extends Dexie {
  plans!: Table<Plan, string>;
  buckets!: Table<BucketAllocation, string>;
  taxComponents!: Table<TaxComponent, string>;
  expenses!: Table<ExpenseItem, string>;
  snapshots!: Table<MonthlySnapshot, string>;
  changelog!: Table<ChangeLogEntry, string>;

  constructor() {
    super('TalliofiDB');

    this.version(1).stores({
      plans: 'id, name, createdAt, updatedAt',
      buckets: 'id, planId, sortOrder',
      taxComponents: 'id, planId, sortOrder',
      expenses: 'id, planId, bucketId, category, frequency, createdAt',
      snapshots: 'id, planId, yearMonth, [planId+yearMonth]',
      changelog: 'id, planId, timestamp, entityType',
    });
  }
}

export const db = new TalliofiDatabase();

export async function clearAllData(): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.plans,
      db.buckets,
      db.taxComponents,
      db.expenses,
      db.snapshots,
      db.changelog,
    ],
    async () => {
      await db.plans.clear();
      await db.buckets.clear();
      await db.taxComponents.clear();
      await db.expenses.clear();
      await db.snapshots.clear();
      await db.changelog.clear();
    },
  );
}
```

### 1.8 Plan Repository

**`src/data/repos/plan-repo.ts`**

```typescript
import { db } from '../db';
import type { Plan } from '@/domain/plan/types';
import { PlanSchema } from '@/domain/plan/schemas';

export const planRepo = {
  async getActive(): Promise<Plan | undefined> {
    const plans = await db.plans.orderBy('createdAt').limit(1).toArray();
    return plans[0];
  },

  async getById(id: string): Promise<Plan | undefined> {
    return db.plans.get(id);
  },

  async create(plan: Plan): Promise<Plan> {
    const validated = PlanSchema.parse(plan);
    await db.plans.add(validated);
    return validated;
  },

  async update(plan: Plan): Promise<Plan> {
    const existing = await db.plans.get(plan.id);
    if (!existing) throw new Error(`Plan not found: ${plan.id}`);

    const updated: Plan = {
      ...plan,
      version: existing.version + 1,
      updatedAt: new Date().toISOString(),
    };

    const validated = PlanSchema.parse(updated);
    await db.plans.put(validated);
    return validated;
  },

  async delete(id: string): Promise<void> {
    await db.transaction(
      'rw',
      [db.plans, db.buckets, db.taxComponents, db.expenses, db.snapshots],
      async () => {
        await db.buckets.where('planId').equals(id).delete();
        await db.taxComponents.where('planId').equals(id).delete();
        await db.expenses.where('planId').equals(id).delete();
        await db.snapshots.where('planId').equals(id).delete();
        await db.plans.delete(id);
      },
    );
  },
};
```

### 1.9 Snapshot Repository

**`src/data/repos/snapshot-repo.ts`**

```typescript
import { db } from '../db';
import type { MonthlySnapshot } from '@/domain/plan/types';

export const snapshotRepo = {
  async getByPlanId(planId: string): Promise<MonthlySnapshot[]> {
    return db.snapshots.where('planId').equals(planId).sortBy('yearMonth');
  },

  async getByPlanAndMonth(
    planId: string,
    yearMonth: string,
  ): Promise<MonthlySnapshot | undefined> {
    return db.snapshots
      .where('[planId+yearMonth]')
      .equals([planId, yearMonth])
      .first();
  },

  async upsert(snapshot: MonthlySnapshot): Promise<void> {
    await db.snapshots.put(snapshot);
  },

  async deleteByPlanId(planId: string): Promise<void> {
    await db.snapshots.where('planId').equals(planId).delete();
  },
};
```

### 1.10 Expense Repository

**`src/data/repos/expense-repo.ts`**

```typescript
import { db } from '../db';
import type { ExpenseItem } from '@/domain/plan/types';
import { ExpenseItemSchema } from '@/domain/plan/schemas';

export const expenseRepo = {
  async getByPlanId(planId: string): Promise<ExpenseItem[]> {
    return db.expenses.where('planId').equals(planId).toArray();
  },

  async getByBucketId(bucketId: string): Promise<ExpenseItem[]> {
    return db.expenses.where('bucketId').equals(bucketId).toArray();
  },

  async create(expense: ExpenseItem): Promise<ExpenseItem> {
    const validated = ExpenseItemSchema.parse(expense);
    await db.expenses.add(validated);
    return validated;
  },

  async update(expense: ExpenseItem): Promise<ExpenseItem> {
    const validated = ExpenseItemSchema.parse({
      ...expense,
      updatedAt: new Date().toISOString(),
    });
    await db.expenses.put(validated);
    return validated;
  },

  async delete(id: string): Promise<void> {
    await db.expenses.delete(id);
  },

  async deleteByPlanId(planId: string): Promise<void> {
    await db.expenses.where('planId').equals(planId).delete();
  },
};
```

### 1.11 Bucket Repository

**`src/data/repos/bucket-repo.ts`**

```typescript
import { db } from '../db';
import type { BucketAllocation } from '@/domain/plan/types';
import { BucketAllocationSchema } from '@/domain/plan/schemas';

export const bucketRepo = {
  async getByPlanId(planId: string): Promise<BucketAllocation[]> {
    return db.buckets.where('planId').equals(planId).sortBy('sortOrder');
  },

  async create(bucket: BucketAllocation): Promise<BucketAllocation> {
    const validated = BucketAllocationSchema.parse(bucket);
    await db.buckets.add(validated);
    return validated;
  },

  async update(bucket: BucketAllocation): Promise<BucketAllocation> {
    const validated = BucketAllocationSchema.parse(bucket);
    await db.buckets.put(validated);
    return validated;
  },

  async delete(id: string): Promise<void> {
    await db.expenses.where('bucketId').equals(id).modify({ bucketId: '' });
    await db.buckets.delete(id);
  },
};
```

### 1.12 Tax Component Repository

**`src/data/repos/tax-component-repo.ts`**

```typescript
import { db } from '../db';
import type { TaxComponent } from '@/domain/plan/types';
import { TaxComponentSchema } from '@/domain/plan/schemas';

export const taxComponentRepo = {
  async getByPlanId(planId: string): Promise<TaxComponent[]> {
    return db.taxComponents.where('planId').equals(planId).sortBy('sortOrder');
  },

  async create(component: TaxComponent): Promise<TaxComponent> {
    const validated = TaxComponentSchema.parse(component);
    await db.taxComponents.add(validated);
    return validated;
  },

  async update(component: TaxComponent): Promise<TaxComponent> {
    const validated = TaxComponentSchema.parse(component);
    await db.taxComponents.put(validated);
    return validated;
  },

  async delete(id: string): Promise<void> {
    await db.taxComponents.delete(id);
  },
};
```

### Phase 1 Deliverables

- [ ] Money module with all arithmetic including `divideMoney`
- [ ] Frequency normalization + denormalization
- [ ] Core types with normalized model (Plan, BucketAllocation, ExpenseItem, TaxComponent as separate records)
- [ ] Zod v4 schemas for all records + form inputs + export format
- [ ] Calculation engine (`computePlanSummary` accepting `PlanComputeInput`)
- [ ] Budget rules and alert generation
- [ ] Dexie database with 6 tables (plans, buckets, taxComponents, expenses, snapshots, changelog)
- [ ] Repos: plan, bucket, expense, tax-component, snapshot, changelog
- [ ] Unit tests for money, normalize, calc, rules (target: 100% domain coverage)

---

## Phase 2: App Shell + Routing + Onboarding

### 2.1 Query Client

**`src/lib/query-client.ts`**

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute — Dexie reads are fast
      gcTime: 1000 * 60 * 10,
      retry: false, // IndexedDB errors won't resolve with retries
    },
  },
});
```

### 2.2 App Providers

**`src/app/providers.tsx`**

```typescript
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### 2.3 Router

**`src/app/router.tsx`**

```typescript
import { createBrowserRouter } from 'react-router';
import { lazy } from 'react';
import { AppLayout } from './layout';

const DashboardPage = lazy(() => import('@/features/dashboard/pages/dashboard-page'));
const OnboardingPage = lazy(() => import('@/features/onboarding/pages/onboarding-page'));
const IncomePage = lazy(() => import('@/features/income/pages/income-page'));
const TaxesPage = lazy(() => import('@/features/taxes/pages/taxes-page'));
const ExpensesPage = lazy(() => import('@/features/expenses/pages/expenses-page'));
const BucketsPage = lazy(() => import('@/features/buckets/pages/buckets-page'));
const HistoryPage = lazy(() => import('@/features/history/pages/history-page'));
const SettingsPage = lazy(() => import('@/features/settings/pages/settings-page'));

export const router = createBrowserRouter([
  {
    path: '/onboarding',
    element: <OnboardingPage />,
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'income', element: <IncomePage /> },
      { path: 'taxes', element: <TaxesPage /> },
      { path: 'expenses', element: <ExpensesPage /> },
      { path: 'buckets', element: <BucketsPage /> },
      { path: 'history', element: <HistoryPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]);
```

### 2.4 App Layout

**`src/app/layout.tsx`**

Shell with sidebar navigation (desktop) or bottom tabs (mobile). The layout checks for an active plan — if none exists, redirects to `/onboarding`.

### 2.5 Onboarding Wizard

Multi-step form that creates the user's first plan:

| Step        | What the user does                             | Data created                          |
| ----------- | ---------------------------------------------- | ------------------------------------- |
| 1. Income   | Enter gross income + frequency                 | `grossIncomeCents`, `incomeFrequency` |
| 2. Taxes    | Set effective rate or itemized breakdown       | `taxConfig`                           |
| 3. Buckets  | Name buckets, set percentage or fixed targets  | `bucketAllocations[]`                 |
| 4. Expenses | Add initial recurring expenses (skippable)     | `expenses[]`                          |
| 5. Summary  | Review everything, see first dashboard preview | Plan saved to Dexie                   |

The wizard uses React Hook Form for each step, with Zustand tracking the current step index. On completion, the full plan is validated with `PlanSchema` and written to Dexie via `planRepo.create()`.

### 2.6 Error Boundary

**`src/components/feedback/error-boundary.tsx`**

React error boundary at the route level. Catches rendering errors and shows a recovery UI with "Refresh" and "Clear data" options. Logs errors to console (no external services — privacy first).

### 2.7 Empty State Component

**`src/components/feedback/empty-state.tsx`**

Reusable component for empty lists (no expenses yet, no snapshots yet). Shows an icon, title, description, and optional CTA button.

### Phase 2 Deliverables

- [ ] `app/providers.tsx` with QueryClientProvider
- [ ] `app/router.tsx` with lazy-loaded routes
- [ ] `app/layout.tsx` with sidebar/bottom tab navigation
- [ ] Onboarding wizard (5 steps)
- [ ] `hooks/use-active-plan.ts` — TanStack Query hook
- [ ] `stores/ui-store.ts` — ephemeral UI state
- [ ] Error boundary component
- [ ] Empty state component
- [ ] Save indicator component
- [ ] Page header component
- [ ] Sidebar navigation component
- [ ] Required shadcn components: `button`, `card`, `input`, `label`, `select`, `dialog`, `sidebar`, `tabs`, `separator`, `badge`, `tooltip`

---

## Phase 3: Feature Pages

### 3.1 Income Page

Form to edit gross income and pay frequency. Uses React Hook Form + `zodResolver` with `IncomeInputSchema`. Mutations via TanStack Query write to Dexie and invalidate `['active-plan']`.

### 3.2 Taxes Page

Two modes:

- **Simple**: Single effective tax rate slider/input
- **Itemized**: Add/remove tax components (Federal, State, FICA, Medicare, etc.) each with their own rate

Toggle between modes. Total effective rate shown as a computed summary.

### 3.3 Buckets Page

List of user-defined buckets. Each bucket has:

- Name (user-defined, not from a fixed enum)
- Color picker
- Mode toggle: percentage of net income OR fixed dollar amount
- Target value (percentage or dollars depending on mode)

Visual bar showing total allocation with remaining unallocated percentage.

### 3.4 Expenses Page

Expense list with:

- **Filters** (nuqs): category, bucket, frequency, fixed/variable
- **Sort** (nuqs): name, amount, category, date added
- **CRUD**: Add/edit via sheet or dialog, delete with confirmation
- **Bulk display**: Monthly normalized amount shown alongside original frequency

### 3.5 Shared Form Components

**`src/components/forms/money-input.tsx`**

Input that accepts dollar values, stores as cents internally. Features:

- Currency symbol prefix
- Formatted on blur (e.g., `$1,234.56`)
- Raw number input during editing
- Min/max constraints
- `inputMode="decimal"` for mobile keyboards

**`src/components/forms/percent-input.tsx`**

Input with `%` suffix. Stores as a number (0-100). Formatted on blur.

### 3.6 Auto-Save

All feature pages auto-save changes. The flow:

1. Form value changes → debounced (800ms)
2. TanStack mutation fires → writes to Dexie
3. Mutation `onMutate` → `saveStatus: 'saving'`
4. Mutation `onSuccess` → `saveStatus: 'saved'`
5. Save indicator in page header shows status

### Phase 3 Deliverables

- [ ] Income page with form
- [ ] Taxes page with simple/itemized modes
- [ ] Buckets page with allocation management
- [ ] Expenses page with list, CRUD, filters, sorting
- [ ] MoneyInput shared component
- [ ] PercentInput shared component
- [ ] Auto-save hook wired to TanStack mutations
- [ ] Required shadcn components: `form`, `sheet`, `dropdown-menu`, `alert-dialog`, `switch`, `slider`, `popover`, `command`, `sonner` (toast)

---

## Phase 4: Dashboard + Charts

### 4.1 Dashboard Layout

```
Desktop (>= 1024px):
+-------------------+--------------------+
|  Gross → Net      |   Bucket Donut     |
|  Waterfall Card   |   Chart            |
+-------------------+--------------------+
|       Key Numbers (4-column grid)      |
|  Net Income | Expenses | Surplus | Rate|
+----------------------------------------+
|  Expense Trend    |  Distribution Bar  |
|  Line Chart       |  Stacked Bar       |
+-------------------+--------------------+
|           Alerts Panel                 |
+----------------------------------------+

Mobile (< 768px):
+----------------------------+
|    Gross → Net Summary     |
+----------------------------+
|      Bucket Donut          |
+----------------------------+
|   Key Numbers (2-col grid) |
+----------------------------+
|   Expense Trend Line       |
+----------------------------+
|   Alerts Panel             |
+----------------------------+
```

### 4.2 Dashboard Components

| Component             | Data Source            | Chart Type                                        |
| --------------------- | ---------------------- | ------------------------------------------------- |
| `income-summary-card` | `computePlanSummary()` | Waterfall: gross → tax → net                      |
| `bucket-donut-chart`  | `bucketAnalysis[]`     | shadcn PieChart                                   |
| `key-numbers-grid`    | `PlanSummary`          | Stat cards (net, expenses, surplus, savings rate) |
| `expense-trend-chart` | `snapshots[]`          | shadcn LineChart (monthly totals over time)       |
| `alerts-panel`        | `alerts[]`             | Styled alert list with severity badges            |

### 4.3 `usePlanSummary` Hook

```typescript
// features/dashboard/hooks/use-plan-summary.ts
import { useMemo } from 'react';
import { useActivePlan } from '@/hooks/use-active-plan';
import { useQuery } from '@tanstack/react-query';
import { expenseRepo } from '@/data/repos/expense-repo';
import { bucketRepo } from '@/data/repos/bucket-repo';
import { taxComponentRepo } from '@/data/repos/tax-component-repo';
import { computePlanSummary } from '@/domain/plan/calc';

export function usePlanSummary() {
  const { data: plan, isLoading: planLoading } = useActivePlan();
  const planId = plan?.id ?? '';

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', planId],
    queryFn: () => expenseRepo.getByPlanId(planId),
    enabled: !!planId,
  });

  const { data: buckets = [] } = useQuery({
    queryKey: ['buckets', planId],
    queryFn: () => bucketRepo.getByPlanId(planId),
    enabled: !!planId,
  });

  const { data: taxComponents = [] } = useQuery({
    queryKey: ['tax-components', planId],
    queryFn: () => taxComponentRepo.getByPlanId(planId),
    enabled: !!planId,
  });

  const summary = useMemo(
    () =>
      plan
        ? computePlanSummary({ plan, buckets, expenses, taxComponents })
        : null,
    [plan, buckets, expenses, taxComponents],
  );

  return { summary, plan, isLoading: planLoading };
}
```

### Phase 4 Deliverables

- [ ] Dashboard page with responsive grid layout
- [ ] Income summary card (waterfall)
- [ ] Bucket donut chart
- [ ] Key numbers grid
- [ ] Expense trend chart (requires snapshots from Phase 5 for historical data; show current month data initially)
- [ ] Alerts panel
- [ ] `usePlanSummary` hook
- [ ] Install shadcn chart components

---

## Phase 5: History + Snapshots

### 5.1 Snapshot Generation

**`src/domain/plan/snapshot.ts`**

```typescript
import type {
  Plan,
  BucketAllocation,
  ExpenseItem,
  TaxComponent,
  MonthlySnapshot,
} from './types';
import { computePlanSummary } from './calc';
import type { PlanComputeInput } from './calc';

export function createMonthlySnapshot(
  input: PlanComputeInput,
): MonthlySnapshot {
  const summary = computePlanSummary(input);

  return {
    id: crypto.randomUUID(),
    planId: input.plan.id,
    yearMonth: summary.yearMonth,
    grossIncomeCents: summary.grossMonthlyIncome,
    netIncomeCents: summary.netMonthlyIncome,
    totalExpensesCents: summary.totalMonthlyExpenses,
    bucketSummaries: summary.bucketAnalysis.map((b) => ({
      bucketId: b.bucketId,
      bucketName: b.bucketName,
      allocatedCents: b.targetAmountCents,
      spentCents: b.actualAmountCents,
      remainingCents: b.varianceCents,
    })),
    createdAt: new Date().toISOString(),
  };
}
```

### 5.2 Rolling Averages (Computed, Never Stored)

```typescript
import type { MonthlySnapshot, RollingAverages } from './types';
import type { Cents } from '@/domain/money';
import { sumMoney, cents } from '@/domain/money';

export function computeRollingAverages(
  snapshots: readonly MonthlySnapshot[],
  months: 3 | 6 | 12 = 3,
): RollingAverages | null {
  if (snapshots.length < months) return null;

  const recent = [...snapshots]
    .sort((a, b) => b.yearMonth.localeCompare(a.yearMonth))
    .slice(0, months);

  const total = sumMoney(recent.map((s) => s.totalExpensesCents));
  const avgExpenses = cents(Math.round(total / recent.length));

  const trend = calculateTrend(recent);

  return {
    monthsIncluded: recent.length,
    avgTotalExpenses: avgExpenses,
    trend,
  };
}

function calculateTrend(
  snapshots: readonly MonthlySnapshot[],
): 'increasing' | 'decreasing' | 'stable' {
  if (snapshots.length < 2) return 'stable';

  // Compare first half average to second half average
  const mid = Math.floor(snapshots.length / 2);
  const recentHalf = snapshots.slice(0, mid);
  const olderHalf = snapshots.slice(mid);

  const recentAvg =
    recentHalf.reduce((sum, s) => sum + s.totalExpensesCents, 0) /
    recentHalf.length;
  const olderAvg =
    olderHalf.reduce((sum, s) => sum + s.totalExpensesCents, 0) /
    olderHalf.length;

  const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;

  if (changePercent > 5) return 'increasing';
  if (changePercent < -5) return 'decreasing';
  return 'stable';
}
```

### 5.3 History Page

- Snapshot list: month-by-month cards showing net income, total expenses, surplus/deficit
- Month-over-month comparison: highlight what changed
- Trend chart: 3/6/12 month rolling average overlay
- Snapshot trigger: auto-snapshot on first visit each month, or manual "Save snapshot" button

### 5.4 Auto-Snapshot Strategy

On app load, check if a snapshot exists for the current month. If not, and a plan exists, automatically create one. This ensures the user builds a history passively without manual action.

### Phase 5 Deliverables

- [ ] Snapshot generation function
- [ ] Rolling averages computation
- [ ] Trend calculation
- [ ] Auto-snapshot on monthly boundary
- [ ] History page with snapshot list
- [ ] Month-over-month comparison component
- [ ] Trend chart with rolling average overlays
- [ ] `useSnapshots` and `useRollingAverages` hooks

---

## Phase 6: Settings + Export/Import

### 6.1 Settings Page Sections

| Section         | Contents                                  |
| --------------- | ----------------------------------------- |
| **Appearance**  | Theme toggle (light/dark/system)          |
| **Data**        | Export to JSON, Import from JSON          |
| **Privacy**     | Privacy statement (static copy)           |
| **Danger Zone** | Clear all data (with confirmation dialog) |

### 6.2 Export Service

**`src/data/export/export-service.ts`**

Exports the active plan + all snapshots as a versioned JSON file:

```typescript
import { planRepo } from '../repos/plan-repo';
import { bucketRepo } from '../repos/bucket-repo';
import { taxComponentRepo } from '../repos/tax-component-repo';
import { expenseRepo } from '../repos/expense-repo';
import { snapshotRepo } from '../repos/snapshot-repo';

export async function exportData(planId: string): Promise<string> {
  const plan = await planRepo.getById(planId);
  if (!plan) throw new Error('No plan found');

  const [buckets, taxComponents, expenses, snapshots] = await Promise.all([
    bucketRepo.getByPlanId(planId),
    taxComponentRepo.getByPlanId(planId),
    expenseRepo.getByPlanId(planId),
    snapshotRepo.getByPlanId(planId),
  ]);

  const exportPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    plan,
    buckets,
    taxComponents,
    expenses,
    snapshots,
  };

  return JSON.stringify(exportPayload, null, 2);
}

export function downloadAsFile(json: string, filename: string): void {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

### 6.3 Import Service

**`src/data/export/import-service.ts`**

Validates the import file against `ExportSchema`, then writes to Dexie. Shows a preview of what will be imported before committing.

### 6.4 Content Security Policy

**Add to `index.html`:**

```html
<meta
  http-equiv="Content-Security-Policy"
  content="
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  font-src 'self';
  connect-src 'self';
  frame-ancestors 'none';
  form-action 'self';
"
/>
```

Note: The CSP `connect-src` will be expanded to include `https://*.supabase.co wss://*.supabase.co` in the post-MVP sync phase.

### Phase 6 Deliverables

- [ ] Settings page with all sections
- [ ] Theme toggle (persisted to localStorage — this is the one appropriate use of localStorage)
- [ ] Export to JSON with download
- [ ] Import from JSON with validation + preview
- [ ] Clear all data with confirmation
- [ ] CSP meta tag in index.html
- [ ] Privacy statement copy

---

## Post-MVP: Cloud Sync

Cloud sync is a separate body of work with two tiers. Build Tier 2 first — it serves most users and validates the sync architecture. Add Tier 3 later for privacy-maximizing users.

### Storage Tiers

| Tier  | Mode                 | Auth Required | Data Format                    | Use Case                              |
| ----- | -------------------- | ------------- | ------------------------------ | ------------------------------------- |
| **1** | Local-only (default) | No            | Dexie / IndexedDB              | Privacy-first, offline, no account    |
| **2** | Supabase direct      | Yes           | Plaintext in Postgres with RLS | Most users who want cross-device sync |
| **3** | Supabase encrypted   | Yes           | AES-256-GCM blobs in Postgres  | Users who don't trust the server      |

### Data Layer Strategy Pattern

The app uses a repo interface so the UI layer doesn't know or care where data lives:

```
┌─────────────────┐
│  TanStack Query  │  ← same hooks everywhere
└────────┬────────┘
         │
    ┌────▼────┐
    │  Repo   │  ← getExpenses(), createExpense(), etc.
    │  Router │
    └────┬────┘
         │
   ┌─────┼──────────────┐
   │     │               │
┌──▼──┐ ┌▼─────────┐ ┌──▼──────────┐
│Dexie│ │ Supabase  │ │ Supabase    │
│Repo │ │ Repo      │ │ Encrypted   │
│(T1) │ │ (T2)      │ │ Repo (T3)   │
└─────┘ └───────────┘ └─────────────┘
```

### Dependencies

```bash
pnpm add @supabase/supabase-js
```

### Tier 2: Supabase Direct Storage

#### Schema

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  gross_income_cents BIGINT NOT NULL,
  income_frequency TEXT NOT NULL,
  tax_mode TEXT NOT NULL DEFAULT 'simple',
  tax_effective_rate NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER DEFAULT 1
);

CREATE TABLE tax_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rate_percent NUMERIC(5,2) NOT NULL,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE buckets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  mode TEXT NOT NULL,
  target_percentage NUMERIC(5,2),
  target_amount_cents BIGINT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  bucket_id UUID REFERENCES buckets(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  amount_cents BIGINT NOT NULL,
  frequency TEXT NOT NULL,
  category TEXT NOT NULL,
  is_fixed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL,
  gross_income_cents BIGINT NOT NULL,
  net_income_cents BIGINT NOT NULL,
  total_expenses_cents BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plan_id, year_month)
);

CREATE TABLE snapshot_buckets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
  bucket_id UUID,
  bucket_name TEXT NOT NULL,
  allocated_cents BIGINT NOT NULL,
  spent_cents BIGINT NOT NULL,
  remaining_cents BIGINT NOT NULL
);

-- RLS policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshot_buckets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own data" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Own data" ON plans FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own data" ON tax_components FOR ALL
  USING (plan_id IN (SELECT id FROM plans WHERE user_id = auth.uid()));
CREATE POLICY "Own data" ON buckets FOR ALL
  USING (plan_id IN (SELECT id FROM plans WHERE user_id = auth.uid()));
CREATE POLICY "Own data" ON expenses FOR ALL
  USING (plan_id IN (SELECT id FROM plans WHERE user_id = auth.uid()));
CREATE POLICY "Own data" ON snapshots FOR ALL
  USING (plan_id IN (SELECT id FROM plans WHERE user_id = auth.uid()));
CREATE POLICY "Own data" ON snapshot_buckets FOR ALL
  USING (snapshot_id IN (
    SELECT s.id FROM snapshots s
    JOIN plans p ON s.plan_id = p.id
    WHERE p.user_id = auth.uid()
  ));

-- Performance indexes
CREATE INDEX idx_plans_user ON plans(user_id);
CREATE INDEX idx_expenses_plan ON expenses(plan_id);
CREATE INDEX idx_expenses_category ON expenses(plan_id, category);
CREATE INDEX idx_buckets_plan ON buckets(plan_id);
CREATE INDEX idx_snapshots_plan_month ON snapshots(plan_id, year_month);
```

### Tier 3: Supabase Encrypted Storage

All data encrypted with AES-256-GCM before leaving the device. Key derived via PBKDF2 (600,000 iterations) from user password. The server stores opaque blobs and cannot query or inspect data.

#### Sync Engine State Machine

```
States: idle | syncing | error | retry_pending | offline

Transitions:
  idle → syncing (triggerSync)
  syncing → idle (success)
  syncing → error (failure)
  error → retry_pending (scheduleRetry with exponential backoff)
  retry_pending → syncing (retryTimeout)
  * → offline (network lost)
  offline → syncing (network restored + pending changes)
```

#### Conflict Resolution

- **Last-write-wins** using `timestamp + deviceId` tie-break
- **Merge** for additive items (expenses) by ID
- **Tombstones** for deletions (`deletedAt` field)

### Post-MVP Deliverables

#### Tier 2

- [ ] Supabase project setup and schema migration
- [ ] Auth flow (PKCE for OAuth, email/password)
- [ ] Supabase repo implementations (same interface as Dexie repos)
- [ ] Storage mode selector in settings (local / cloud)
- [ ] Migration tool: local data → Supabase on first sync
- [ ] Bidirectional sync between Dexie (offline cache) and Supabase

#### Tier 3 (after Tier 2)

- [ ] Key derivation and management (PBKDF2)
- [ ] AES-256-GCM encrypt/decrypt
- [ ] Encrypted sync engine with offline queue
- [ ] Conflict resolution
- [ ] Session timeout (15 min inactivity)

---

## Testing Strategy

### Testing Pyramid

```
              E2E (Playwright)
            /                  \
   Integration (Vitest + RTL)
  /                              \
Unit Tests (Vitest) — Domain Logic
```

### Unit Tests (Domain Layer)

| Module         | Key Test Cases                                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `money.ts`     | Overflow protection, rounding (banker's rounding edge cases), formatting locales                                         |
| `normalize.ts` | Every frequency → monthly conversion, denormalize round-trip accuracy                                                    |
| `calc.ts`      | Net income after tax (simple + itemized), deficit detection, bucket analysis (percentage + fixed), zero income edge case |
| `rules.ts`     | Each alert code triggers at correct thresholds, no false positives                                                       |
| `snapshot.ts`  | Snapshot captures correct computed values                                                                                |
| `schemas.ts`   | Valid data passes, invalid data rejected with correct error messages                                                     |

### Integration Tests (Feature Hooks + Repos)

| Area               | Key Test Cases                                          |
| ------------------ | ------------------------------------------------------- |
| `plan-repo.ts`     | CRUD operations, version incrementing, cascading delete |
| `snapshot-repo.ts` | Upsert, query by plan+month compound index              |
| `use-active-plan`  | Returns plan from Dexie, loading state, empty state     |
| `use-plan-summary` | Computes summary from plan data                         |

### E2E Tests (Playwright)

| Flow          | What to verify                                            |
| ------------- | --------------------------------------------------------- |
| Onboarding    | Complete wizard → plan created → redirected to dashboard  |
| Add expense   | Create expense → appears in list → reflected in dashboard |
| Export/import | Export → clear data → import → data restored              |
| Responsive    | Mobile layout renders correctly at 375px width            |

### Test Setup

```typescript
// vitest.setup.ts
import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { beforeEach } from 'vitest';
import { clearAllData } from '@/data/db';

beforeEach(async () => {
  await clearAllData();
});
```

Required dev dependency: `pnpm add -D fake-indexeddb`

---

## Security Checklist

### MVP

- [ ] No analytics or third-party tracking scripts
- [ ] Strict CSP headers in `index.html`
- [ ] Zod validation on all user inputs (form boundaries)
- [ ] Zod validation on all imported data
- [ ] Self-hosted or system fonts only (no external CDN)
- [ ] No external CDN dependencies
- [ ] Export and delete data functionality
- [ ] `frame-ancestors: 'none'` to prevent clickjacking

### Post-MVP (Sync Phase)

- [ ] AES-256-GCM client-side encryption before any data leaves the device
- [ ] PBKDF2 with 600,000 iterations for key derivation
- [ ] Passwords never stored, only used for key derivation
- [ ] RLS policies on all Supabase tables
- [ ] PKCE flow for OAuth
- [ ] Session timeout after 15 minutes of inactivity

---

## Privacy UX Copy

```typescript
const PRIVACY_COPY = {
  localOnly: 'Your data stays on this device only.',
  syncEnabled:
    'Your data is encrypted on your device before syncing. We never see your financial information.',
  noTracking: "We don't use analytics, trackers, or third-party scripts.",
  dataControl: 'Export or delete your data at any time.',
} as const;
```

---

## Quick Start Commands

```bash
# Development
pnpm install
pnpm dev

# Testing
pnpm test              # watch mode
pnpm test:run          # single run
pnpm test:coverage     # with coverage
pnpm test:e2e          # Playwright

# Code quality
pnpm lint
pnpm typecheck
pnpm format:check

# Building
pnpm build
pnpm preview
```
