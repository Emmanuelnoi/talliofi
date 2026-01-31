# Phase 2 Design Specification: App Shell + Routing + Onboarding

> Precise, actionable design specifications for implementing Talliofi's app shell, navigation, and onboarding wizard. All dimensions, spacing, colors, and transitions are specified to the pixel and millisecond.

---

## Table of Contents

1. [App Layout Specifications](#app-layout-specifications)
2. [Onboarding Wizard Design](#onboarding-wizard-design)
3. [Navigation Design](#navigation-design)
4. [Error Boundary Design](#error-boundary-design)
5. [Empty State Design](#empty-state-design)
6. [Save Indicator Design](#save-indicator-design)
7. [Color Variables for Financial Semantics](#color-variables-for-financial-semantics)

---

## App Layout Specifications

### Layout Structure Overview

The app uses a responsive two-tier navigation strategy:

- **Desktop (≥ 1024px)**: Sidebar + main content area
- **Tablet (768px - 1023px)**: Bottom tabs (sidebar adds limited value)
- **Mobile (< 768px)**: Bottom tabs (primary navigation)

### 1.1 Desktop Sidebar Layout

#### Dimensions

| Element                       | Value | Unit | Notes                                              |
| ----------------------------- | ----- | ---- | -------------------------------------------------- |
| Sidebar width                 | 256   | px   | Consistent 16×16 unit grid (16 × 16px)             |
| Sidebar width (collapsed)     | 64    | px   | Icon-only mode for space maximization              |
| Sidebar collapse transition   | 200   | ms   | ease-in-out for smooth state change                |
| Nav item height               | 40    | px   | Generous touch target (not 44px minimum but close) |
| Nav item padding              | 12 16 | px   | Vertical (12px) Horizontal (16px)                  |
| Icon size                     | 20    | px   | Lucide React default size                          |
| Text size                     | 14    | px   | 0.875rem, body small                               |
| Text weight                   | 500   | —    | Medium weight for clarity                          |
| Gap (icon to label)           | 12    | px   | Clear visual separation                            |
| Spacing (nav items)           | 4     | px   | Stacked vertically with 4px gap via `space-y-1`    |
| Header height                 | 64    | px   | Branding section (logo + app name)                 |
| Header padding                | 16    | px   | All sides, consistent with nav                     |
| Bottom collapse button height | 40    | px   | Matches nav item height                            |
| Collapse button padding       | 8     | px   | Centered icon with breathing room                  |

#### CSS Structure

```css
/* Sidebar container */
aside {
  /* Desktop only */
  @apply hidden lg:flex flex-col fixed h-screen left-0 top-0 w-64 border-r bg-sidebar text-sidebar-foreground transition-all duration-200;
}

/* Collapsed state */
aside.collapsed {
  @apply w-16;
}

/* Header section */
aside .sidebar-header {
  @apply h-16 px-4 py-4 flex items-center gap-3 border-b;
}

aside .sidebar-logo {
  @apply h-5 w-5 flex-shrink-0;
}

aside .sidebar-title {
  @apply text-sm font-semibold truncate;
}

/* When collapsed, hide title */
aside.collapsed .sidebar-title {
  @apply hidden;
}

/* Navigation list */
aside nav {
  @apply flex-1 overflow-y-auto px-3 py-4 space-y-1;
}

/* Nav item */
aside nav a {
  @apply flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 relative;
  min-height: 40px;
}

aside nav a:hover {
  @apply bg-sidebar-accent/50;
}

aside nav a[aria-current='page'] {
  @apply bg-sidebar-accent text-sidebar-accent-foreground font-semibold;
}

aside nav a[aria-current='page']::before {
  content: '';
  @apply absolute left-0 top-0 bottom-0 w-1 rounded-r-sm bg-sidebar-accent-foreground;
}

/* Icon in nav item */
aside nav a svg {
  @apply h-5 w-5 flex-shrink-0;
}

/* Label in nav item */
aside nav a span {
  @apply truncate;
}

/* When collapsed, hide label */
aside.collapsed nav a span {
  @apply hidden;
}

/* Collapse button */
aside .sidebar-footer {
  @apply h-16 px-3 py-2 border-t flex items-center justify-center;
}

aside .sidebar-footer button {
  @apply p-2 rounded-md hover:bg-sidebar-accent transition-colors duration-150;
}

aside .sidebar-footer button svg {
  @apply h-5 w-5 transition-transform duration-200;
}

aside.collapsed .sidebar-footer button svg {
  @apply rotate-180;
}

/* Tooltip for collapsed state */
aside.collapsed nav a[title]::after {
  content: attr(title);
  @apply absolute left-16 px-2 py-1 bg-sidebar-accent text-sidebar-accent-foreground text-xs rounded whitespace-nowrap opacity-0 pointer-events-none transition-opacity duration-200 z-50;
}

aside.collapsed nav a[title]:hover::after {
  @apply opacity-100;
}
```

#### Sidebar Navigation Items (6 items)

| Order | Label     | Icon              | Path       | Notes                              |
| ----- | --------- | ----------------- | ---------- | ---------------------------------- |
| 1     | Dashboard | `LayoutDashboard` | /dashboard | Home, summary view                 |
| 2     | Income    | `DollarSign`      | /income    | Configure income + frequency       |
| 3     | Expenses  | `Receipt`         | /expenses  | Add, edit, delete expenses         |
| 4     | Buckets   | `PieChart`        | /buckets   | Allocation management              |
| 5     | History   | `TrendingUp`      | /history   | Monthly snapshots & trends         |
| 6     | Settings  | `Settings`        | /settings  | Theme, export, import, danger zone |

#### Collapsed Sidebar Tooltips

When sidebar is collapsed (w-16), tooltips appear on hover over nav items. Each tooltip shows the label text.

**CSS for tooltip:**

```css
@supports (backdrop-filter: blur(4px)) {
  aside.collapsed nav a::after {
    backdrop-filter: blur(4px);
  }
}
```

### 1.2 Mobile/Tablet Bottom Tab Navigation

#### Dimensions

| Element             | Value                  | Unit | Notes                            |
| ------------------- | ---------------------- | ---- | -------------------------------- |
| Tab bar height      | 64                     | px   | Fixed bottom position            |
| Tab item width      | flex-grow              | —    | Equal distribution across screen |
| Icon size           | 24                     | px   | Larger on mobile for touch       |
| Label size          | 11                     | px   | 0.6875rem, smaller on mobile     |
| Label weight        | 500                    | —    | Medium weight                    |
| Gap (icon to label) | 4                      | px   | Compact vertical layout          |
| Active indicator    | 4                      | px   | Underline thickness (optional)   |
| Scroll behavior     | safe-area-inset-bottom | —    | Respect notch/safe area          |

#### CSS Structure

```css
/* Bottom tabs (mobile/tablet only) */
nav.bottom-tabs {
  @apply lg:hidden fixed bottom-0 left-0 right-0 border-t bg-background z-40;
  height: 64px;
  padding-bottom: max(0px, env(safe-area-inset-bottom));
}

nav.bottom-tabs-list {
  @apply flex justify-around items-start h-full;
}

nav.bottom-tabs-item {
  @apply flex flex-col items-center justify-center gap-1 flex-1 py-2 px-1 rounded-t-md transition-colors duration-150 text-muted-foreground;
  min-height: 56px;
  touch-action: manipulation;
}

nav.bottom-tabs-item:hover {
  @apply bg-accent/30;
}

nav.bottom-tabs-item[aria-current='page'] {
  @apply text-primary font-semibold;
}

nav.bottom-tabs-item[aria-current='page']::after {
  content: '';
  @apply absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-sm;
  position: absolute;
}

nav.bottom-tabs-item svg {
  @apply h-6 w-6;
}

nav.bottom-tabs-item span {
  @apply text-xs font-medium;
  line-height: 1.1;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

#### Main Content Area Adjustment (Mobile)

When bottom tabs are visible, add bottom padding to prevent content overlap:

```css
main {
  @apply pb-16 lg:pb-0; /* 64px = tab height + safe area */
}

@supports (padding: max(0px)) {
  main {
    padding-bottom: max(4rem, env(safe-area-inset-bottom) + 4rem);
  }
}
```

### 1.3 Content Area

#### Dimensions

| Element                | Value | Unit | Notes                                     |
| ---------------------- | ----- | ---- | ----------------------------------------- |
| Main padding (desktop) | 24    | px   | All sides on ≥ 1024px                     |
| Main padding (tablet)  | 20    | px   | All sides on 768px - 1023px               |
| Main padding (mobile)  | 16    | px   | All sides on < 768px                      |
| Max width (desktop)    | 1440  | px   | Optional constraint for very wide screens |
| Gap between sections   | 24    | px   | Consistent spacing between blocks         |

#### CSS

```css
main {
  @apply flex-1 overflow-y-auto overflow-x-hidden bg-background;
  scroll-behavior: smooth;
}

main > * {
  @apply max-w-full;
}

/* Content wrapper with consistent padding */
main .page-container {
  @apply px-6 py-6 lg:px-6 lg:py-8;
}

@media (max-width: 768px) {
  main .page-container {
    @apply px-4 py-4;
  }
}

@media (max-width: 480px) {
  main .page-container {
    @apply px-3 py-3;
  }
}
```

### 1.4 Header (Page Title + Save Status)

Every page has a header showing the page title and optional save indicator.

#### Dimensions

| Element                                 | Value                   | Unit | Notes                    |
| --------------------------------------- | ----------------------- | ---- | ------------------------ |
| Header height                           | 60                      | px   | Title + status indicator |
| Title size                              | 30                      | px   | 1.875rem, `text-3xl`     |
| Title weight                            | 700                     | —    | Bold, high contrast      |
| Description size                        | 14                      | px   | 0.875rem, muted color    |
| Description color                       | var(--muted-foreground) | —    | Secondary visual weight  |
| Spacing (title to description)          | 4                       | px   | Tight vertical grouping  |
| Spacing (title block to save indicator) | 24                      | px   | Horizontal gap           |

#### CSS

```css
.page-header {
  @apply flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8;
}

.page-header-content {
  @apply space-y-1 flex-1;
}

.page-header h1 {
  @apply text-3xl font-bold tracking-tight;
}

.page-header p {
  @apply text-sm text-muted-foreground;
}

.page-header-action {
  @apply flex-shrink-0;
}
```

#### Example JSX

```jsx
<div className="page-header">
  <div className="page-header-content">
    <h1>Income</h1>
    <p>Configure your gross income and pay frequency</p>
  </div>
  <div className="page-header-action">
    <SaveIndicator />
  </div>
</div>
```

---

## Onboarding Wizard Design

### Overview

Five-step wizard that guides first-time users through setup:

1. **Income**: Gross income + frequency
2. **Taxes**: Simple or itemized tax configuration
3. **Buckets**: Create budget buckets with allocations
4. **Expenses**: (Optional) Add initial recurring expenses
5. **Summary**: Review and confirm all data

### 2.1 Wizard Container Layout

#### Dimensions

| Element                     | Value | Unit | Notes                          |
| --------------------------- | ----- | ---- | ------------------------------ |
| Container max-width         | 448   | px   | 28rem, narrow column for focus |
| Container padding (desktop) | 24    | px   | Breathing room on sides        |
| Container padding (mobile)  | 16    | px   | Smaller screens                |
| Vertical padding            | 48    | px   | 3rem top/bottom spacing        |
| Overall height              | 100vh | —    | Full viewport, centered        |

#### CSS

```css
.onboarding-container {
  @apply flex h-screen items-center justify-center px-6 lg:px-0;
}

.onboarding-content {
  @apply w-full max-w-md rounded-lg border bg-card p-8 shadow-sm;
}

@media (max-width: 640px) {
  .onboarding-content {
    @apply p-6 rounded-none border-0 shadow-none h-screen flex flex-col justify-center;
  }
}
```

### 2.2 Progress Indicator

Visual indication of which step the user is on.

#### Design: Stepper with Progress Bar

**Components:**

1. **Circles** (5 circles, numbered 1-5)
   - Incomplete: light gray circle, dark text number
   - Current: lighter fill, darker border
   - Complete: filled with primary color, checkmark icon

2. **Progress bar** below circles (animates width)

#### Dimensions

| Element              | Value | Unit | Notes                           |
| -------------------- | ----- | ---- | ------------------------------- |
| Circle diameter      | 32    | px   | Large enough for number clarity |
| Circle border        | 2     | px   | Subtle outline                  |
| Circle gap           | 8     | px   | Spacing between circles         |
| Progress bar height  | 4     | px   | Thin, subtle                    |
| Progress bar spacing | 8     | px   | Gap between circles and bar     |
| Transition duration  | 300   | ms   | Smooth animation                |

#### CSS

```css
.onboarding-progress {
  @apply mb-8;
}

.onboarding-steps {
  @apply flex justify-between items-center gap-2 mb-2;
}

.onboarding-step {
  @apply flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300;
}

.onboarding-step.incomplete {
  @apply bg-muted text-muted-foreground border border-border;
}

.onboarding-step.current {
  @apply bg-primary/20 text-primary border-2 border-primary;
}

.onboarding-step.complete {
  @apply bg-primary text-primary-foreground;
}

.onboarding-progress-bar {
  @apply h-1 w-full rounded-full bg-muted overflow-hidden;
}

.onboarding-progress-bar-fill {
  @apply h-full bg-primary transition-all duration-300;
}
```

#### JSX Example

```jsx
<div className="onboarding-progress">
  <div className="onboarding-steps">
    {steps.map((_, idx) => (
      <div
        key={idx}
        className={cn(
          'onboarding-step',
          idx < currentStep && 'complete',
          idx === currentStep && 'current',
          idx > currentStep && 'incomplete',
        )}
      >
        {idx < currentStep ? <Check className="h-4 w-4" /> : idx + 1}
      </div>
    ))}
  </div>
  <div className="onboarding-progress-bar">
    <div
      className="onboarding-progress-bar-fill"
      style={{
        width: `${((currentStep + 1) / steps.length) * 100}%`,
      }}
    />
  </div>
</div>
```

### 2.3 Step Content Layout

Each step has a consistent structure:

#### Dimensions

| Element                 | Value                   | Unit | Notes                             |
| ----------------------- | ----------------------- | ---- | --------------------------------- |
| Title size              | 28                      | px   | 1.75rem, `text-2xl`               |
| Title weight            | 700                     | —    | Bold                              |
| Description size        | 14                      | px   | 0.875rem, muted color             |
| Description color       | var(--muted-foreground) | —    | Secondary                         |
| Spacing (title section) | 24                      | px   | Gap to form fields                |
| Field gap               | 20                      | px   | Consistent spacing between inputs |
| Button row gap          | 12                      | px   | Spacing between Back/Next         |

#### CSS

```css
.onboarding-step-content {
  @apply space-y-6;
}

.onboarding-step-header {
  @apply space-y-2;
}

.onboarding-step-title {
  @apply text-2xl font-bold;
}

.onboarding-step-description {
  @apply text-sm text-muted-foreground;
}

.onboarding-step-fields {
  @apply space-y-5;
}

.onboarding-step-actions {
  @apply flex justify-between gap-3 pt-6;
}

.onboarding-step-actions button {
  @apply flex-1;
}

/* On mobile, stack buttons */
@media (max-width: 480px) {
  .onboarding-step-actions {
    @apply flex-col-reverse;
  }

  .onboarding-step-actions button {
    @apply w-full;
  }
}
```

### 2.4 Form Field Patterns

#### Field Container

```css
.form-field {
  @apply space-y-2;
}

.form-field label {
  @apply block text-sm font-medium;
}

.form-field input,
.form-field select,
.form-field textarea {
  @apply w-full;
}

.form-field-hint {
  @apply text-xs text-muted-foreground;
}

.form-field-error {
  @apply text-xs text-destructive;
}
```

### 2.5 Step 1: Income

User enters gross income and selects pay frequency.

#### Layout

```
[Title] Income
[Description] What's your gross income before taxes?

[Field] Gross Income
  [$] Input with currency prefix
  [Hint] Before taxes

[Field] Pay Frequency
  [Radio Group or Select]
  - Weekly
  - Bi-weekly
  - Semi-monthly
  - Monthly
  - Quarterly
  - Annual

[Buttons]
  [Back] [Next]
```

#### Specific Dimensions

| Element                 | Value | Unit | Notes               |
| ----------------------- | ----- | ---- | ------------------- |
| Input height            | 40    | px   | Standard input      |
| Input padding           | 10 16 | px   | Vertical Horizontal |
| Currency symbol padding | 12    | px   | Left padding for $  |
| Select/Radio gap        | 12    | px   | Between options     |

#### CSS

```css
.income-input {
  @apply relative;
}

.income-input-prefix {
  @apply absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium;
}

.income-input input {
  @apply pl-7;
}

.income-frequency-group {
  @apply space-y-3;
}

.income-frequency-option {
  @apply flex items-center gap-3 p-3 rounded-md border border-border cursor-pointer transition-colors duration-150 hover:bg-accent/50;
}

.income-frequency-option input:checked ~ label {
  @apply font-semibold;
}

.income-frequency-option input:checked {
  @apply border-primary;
}
```

### 2.6 Step 2: Taxes

Two modes: simple (single rate) or itemized (multiple components).

#### Layout

```
[Title] Taxes
[Description] How much tax do you pay?

[Mode Toggle]
  [Button] Simple | [Button] Itemized

[Conditional: Simple Mode]
  [Field] Effective Tax Rate (%)
    [Slider or Input]
    [Display] e.g., "24.5%"

[Conditional: Itemized Mode]
  [Field] Add Tax Component (repeatable)
    [Input] Component name (Federal, State, FICA, etc.)
    [Input] Rate (%)
    [Button] Add another
  [Display] Total: 35.2%

[Buttons]
  [Back] [Next]
```

#### Simple Mode Dimensions

| Element             | Value | Unit | Notes                    |
| ------------------- | ----- | ---- | ------------------------ |
| Slider height       | 6     | px   | Default Slider component |
| Slider track height | 6     | px   | Thin, clean              |
| Input height        | 40    | px   | Standard                 |
| Display size        | 32    | px   | Large percentage display |

#### Itemized Mode Dimensions

| Element             | Value | Unit | Notes                   |
| ------------------- | ----- | ---- | ----------------------- |
| Item row gap        | 8     | px   | Name + Rate inputs      |
| Item height         | 40    | px   | Per component row       |
| Items container gap | 12    | px   | Between component items |
| Add button margin   | 12    | px   | Top spacing             |

#### CSS

```css
.tax-mode-toggle {
  @apply flex gap-3 mb-6;
}

.tax-mode-toggle button {
  @apply flex-1 px-4 py-2 rounded-md border transition-colors duration-150;
}

.tax-mode-toggle button.active {
  @apply bg-primary text-primary-foreground border-primary;
}

.tax-simple {
  @apply space-y-4;
}

.tax-rate-display {
  @apply text-4xl font-bold text-primary text-center py-4;
}

.tax-itemized {
  @apply space-y-4;
}

.tax-component-list {
  @apply space-y-3;
}

.tax-component-row {
  @apply flex gap-3 items-end;
}

.tax-component-name {
  @apply flex-1;
}

.tax-component-rate {
  @apply w-24;
}

.tax-total {
  @apply pt-4 border-t text-sm font-semibold text-center;
}

.tax-add-button {
  @apply w-full mt-2;
}
```

### 2.7 Step 3: Buckets

Create named budget buckets with color and allocation mode.

#### Layout

```
[Title] Budgets
[Description] How do you want to allocate your money?

[Bucket List (repeating)]
  [Row]
    [Color Swatch] 48×48px
    [Input] Bucket name (e.g., "Living Expenses")
    [Delete button]
  [Sub-row]
    [Toggle/Radio] Percentage | Fixed Amount
    [Input] 50% | $2,000
  [Spacing] 16px between buckets

[Total Allocation Display]
  Allocated: 85%
  Unallocated: 15% (green if room, red if over 100%)

[Add Button] Add Another Bucket

[Buttons]
  [Back] [Next]
```

#### Dimensions

| Element               | Value | Unit | Notes                        |
| --------------------- | ----- | ---- | ---------------------------- |
| Color swatch size     | 48    | px   | Square, clickable            |
| Swatch border radius  | 6     | px   | Slightly rounded             |
| Swatch border         | 2     | px   | When selected: primary color |
| Bucket row gap        | 8     | px   | Between inputs               |
| Bucket item margin    | 16    | px   | Between bucket rows          |
| Allocation bar height | 24    | px   | Visual indicator             |
| Allocation bar radius | 4     | px   | Subtle corners               |

#### Color Palette (5 pre-selected colors)

Users pick from these five colors:

```css
.bucket-color-swatch {
  @apply h-12 w-12 rounded-md cursor-pointer border-2 border-border transition-all duration-150;
}

.bucket-color-swatch:hover {
  @apply border-ring shadow-md;
}

.bucket-color-swatch.selected {
  @apply border-primary shadow-lg;
  box-shadow: 0 0 0 3px var(--primary-color) / 0.2;
}

/* Predefined bucket colors - use CSS variables from section 7 */
.bucket-color-1 {
  background-color: var(--bucket-1);
}
.bucket-color-2 {
  background-color: var(--bucket-2);
}
.bucket-color-3 {
  background-color: var(--bucket-3);
}
.bucket-color-4 {
  background-color: var(--bucket-4);
}
.bucket-color-5 {
  background-color: var(--bucket-5);
}
```

#### Allocation Bar Display

```css
.allocation-bar {
  @apply h-6 rounded-full bg-muted overflow-hidden;
  display: flex;
}

.allocation-bar-segment {
  @apply transition-all duration-300 relative;
  /* Dynamic width from calculation */
}

.allocation-bar-segment::after {
  content: attr(data-label);
  @apply absolute left-1 top-1/2 -translate-y-1/2 text-xs font-bold text-white mix-blend-darken;
  font-size: 11px;
  line-height: 1;
}

.allocation-bar-unallocated {
  @apply flex-1 bg-muted-foreground/30;
}

.allocation-bar-over {
  @apply bg-destructive;
}
```

### 2.8 Step 4: Expenses (Optional)

Add initial recurring expenses.

#### Layout

```
[Title] Expenses
[Description] Add your recurring expenses (optional, you can add these later)

[Expense List (repeating)]
  [Row]
    [Input] Expense name
    [Input] Amount
    [Select] Frequency
    [Delete button]

[Add Button] Add Another Expense

[Skip Button] (secondary) Skip for now

[Buttons]
  [Back] [Next]
```

#### Dimensions

| Element             | Value | Unit | Notes                |
| ------------------- | ----- | ---- | -------------------- |
| Row gap             | 8     | px   | Between inputs       |
| Item margin         | 16    | px   | Between expense rows |
| Delete button width | 40    | px   | Icon button          |

### 2.9 Step 5: Summary

Review all entered data before saving.

#### Layout

```
[Title] Almost Done!
[Description] Review your plan before we save it

[Card 1] Income
  Gross: $5,000 / month
  Frequency: Monthly

[Card 2] Taxes
  Effective rate: 24%
  Take-home: $3,800 / month

[Card 3] Buckets
  [Color] Rent: $1,500 (39% of net)
  [Color] Groceries: 10% ($380)
  [Color] Savings: 15% ($570)
  Total: 64%

[Card 4] Expenses
  3 expenses added
  Total monthly: $2,450

[Surplus/Deficit Display]
  Net income: $3,800
  Total expenses: $2,450
  Surplus: $1,350 (35%)

[Buttons]
  [Back] [Create Plan]
```

#### CSS

```css
.summary-card {
  @apply rounded-lg border bg-card p-4 space-y-3 mb-4;
}

.summary-card-title {
  @apply font-semibold text-sm;
}

.summary-card-row {
  @apply flex justify-between text-sm;
}

.summary-card-row-label {
  @apply text-muted-foreground;
}

.summary-card-row-value {
  @apply font-medium;
}

.summary-bottom-line {
  @apply rounded-lg border-2 bg-card p-6 text-center space-y-2 mt-6;
}

.summary-bottom-line-label {
  @apply text-sm text-muted-foreground;
}

.summary-bottom-line-value {
  @apply text-4xl font-bold;
}

.summary-bottom-line.surplus {
  @apply border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950;
}

.summary-bottom-line.surplus .summary-bottom-line-value {
  @apply text-green-600 dark:text-green-400;
}

.summary-bottom-line.deficit {
  @apply border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950;
}

.summary-bottom-line.deficit .summary-bottom-line-value {
  @apply text-red-600 dark:text-red-400;
}
```

### 2.10 Button Styling in Onboarding

#### Primary Button (Next / Create Plan)

```css
.onboarding-button-primary {
  @apply px-6 py-2 bg-primary text-primary-foreground font-medium rounded-md transition-all duration-200 hover:bg-primary/90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed;
  min-height: 40px;
}
```

#### Secondary Button (Back)

```css
.onboarding-button-secondary {
  @apply px-6 py-2 border border-border bg-transparent text-foreground font-medium rounded-md transition-all duration-200 hover:bg-accent active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed;
  min-height: 40px;
}
```

#### Tertiary Button (Skip)

```css
.onboarding-button-tertiary {
  @apply px-6 py-2 text-muted-foreground font-medium rounded-md transition-all duration-200 hover:text-foreground hover:bg-accent/30 active:scale-95;
  min-height: 40px;
}
```

### 2.11 Step Transitions

When moving between steps, fade in the new content:

```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.onboarding-step-content {
  animation: fadeInUp 200ms ease-out;
}
```

---

## Navigation Design

### 3.1 Active State Styling

#### Sidebar (Desktop)

Active link has:

- Left border accent: 4px solid, full height
- Background color: `--sidebar-accent` (light neutral)
- Font weight: semibold (600)
- Text color: `--sidebar-accent-foreground`

```css
aside nav a[aria-current='page'] {
  @apply bg-sidebar-accent text-sidebar-accent-foreground font-semibold;
  position: relative;
}

aside nav a[aria-current='page']::before {
  content: '';
  @apply absolute left-0 top-0 bottom-0 w-1 rounded-r-sm;
  background-color: var(--sidebar-accent-foreground);
}
```

#### Bottom Tabs (Mobile)

Active tab has:

- Text color: `--primary` (darker/more saturated)
- Bottom border: 3px solid `--primary`
- Font weight: semibold (600)

```css
nav.bottom-tabs-item[aria-current='page'] {
  @apply text-primary font-semibold;
  border-bottom: 3px solid var(--primary);
}
```

### 3.2 Hover/Focus States

#### Sidebar

```css
aside nav a:hover:not([aria-current='page']) {
  @apply bg-sidebar-accent/50 transition-colors duration-150;
}

aside nav a:focus-visible {
  @apply outline outline-2 outline-offset-2 outline-ring;
}
```

#### Bottom Tabs

```css
nav.bottom-tabs-item:hover {
  @apply bg-accent/30 transition-colors duration-150;
}

nav.bottom-tabs-item:focus-visible {
  @apply outline outline-2 outline-offset-2 outline-ring;
}
```

### 3.3 Icon + Label Alignment

All nav items use flexbox with consistent alignment:

```css
aside nav a,
nav.bottom-tabs-item {
  @apply flex items-center justify-center gap-3;
}

/* Sidebar: horizontal layout */
aside nav a {
  @apply flex-row;
}

/* Bottom tabs: vertical layout */
nav.bottom-tabs-item {
  @apply flex-col;
}
```

### 3.4 Collapsed Sidebar Tooltips

When sidebar is collapsed, show a tooltip on hover. The tooltip appears to the right of the icon:

```css
aside.collapsed nav a::before {
  content: attr(data-label);
  @apply absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded whitespace-nowrap opacity-0 pointer-events-none transition-opacity duration-200 z-50 font-medium;
  line-height: 1.2;
}

aside.collapsed nav a:hover::before {
  @apply opacity-100;
}

/* Optional: Add arrow pointing back */
aside.collapsed nav a::after {
  content: '';
  @apply absolute left-full pointer-events-none opacity-0 transition-opacity duration-200;
  border: 4px solid transparent;
  border-right-color: var(--popover);
  margin-left: -4px;
  margin-top: -4px;
}

aside.collapsed nav a:hover::after {
  @apply opacity-100;
}
```

### 3.5 Mobile Bottom Tab Visibility

On small screens, all 6 nav items are shown in the bottom tab bar. No overflow menu is needed for Phase 2.

If needed in future, add a hamburger menu for secondary actions.

---

## Error Boundary Design

### 4.1 Error Boundary Component

Catches rendering errors and provides recovery UI.

#### Layout

```
[Container] Full viewport, centered

[Card] Rounded, border, shadow
  [Icon] AlertCircle or Warning icon (48×48px)
  [Heading] Something went wrong
  [Description] An error occurred. Please try refreshing the page.

  [Details] (collapsible, gray, small text)
    Error message from error object

  [Buttons]
    [Primary] Refresh page
    [Secondary] Clear all data (danger)
```

#### Dimensions

| Element            | Value | Unit | Notes                        |
| ------------------ | ----- | ---- | ---------------------------- |
| Icon size          | 48    | px   | Large, prominent             |
| Card width         | 448   | px   | max-w-md, same as onboarding |
| Card padding       | 32    | px   | 2rem                         |
| Heading size       | 24    | px   | 1.5rem, `text-2xl`           |
| Description size   | 14    | px   | 0.875rem                     |
| Button row gap     | 12    | px   | Between buttons              |
| Details padding    | 16    | px   | 1rem                         |
| Details margin top | 16    | px   | 1rem                         |

#### CSS

```css
.error-boundary {
  @apply flex h-screen items-center justify-center px-4 bg-background;
}

.error-boundary-card {
  @apply w-full max-w-md rounded-lg border bg-card p-8 shadow-lg space-y-6;
}

.error-boundary-icon {
  @apply mx-auto h-12 w-12 text-destructive;
}

.error-boundary-content {
  @apply space-y-3 text-center;
}

.error-boundary-title {
  @apply text-2xl font-bold;
}

.error-boundary-description {
  @apply text-sm text-muted-foreground;
}

.error-boundary-details {
  @apply rounded-md bg-muted p-4;
}

.error-boundary-details-label {
  @apply text-xs font-semibold text-muted-foreground uppercase tracking-wide;
}

.error-boundary-details-content {
  @apply text-xs text-foreground font-mono mt-2 max-h-32 overflow-y-auto;
}

.error-boundary-actions {
  @apply flex flex-col sm:flex-row gap-3;
}

.error-boundary-actions button {
  @apply flex-1;
}
```

#### JSX Example

```jsx
export function ErrorBoundary({ error, reset }) {
  return (
    <div className="error-boundary">
      <div className="error-boundary-card">
        <div className="error-boundary-icon">
          <AlertCircle className="h-12 w-12" />
        </div>

        <div className="error-boundary-content">
          <h1 className="error-boundary-title">Something went wrong</h1>
          <p className="error-boundary-description">
            An unexpected error occurred. Try refreshing the page or clearing
            your data.
          </p>
        </div>

        {error && (
          <details className="error-boundary-details">
            <summary className="error-boundary-details-label cursor-pointer hover:text-foreground">
              Error details
            </summary>
            <div className="error-boundary-details-content">
              {error.message}
            </div>
          </details>
        )}

        <div className="error-boundary-actions">
          <Button onClick={() => window.location.reload()} className="flex-1">
            Refresh Page
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              // Clear IndexedDB
              clearAllData();
              reset();
            }}
            className="flex-1"
          >
            Clear Data
          </Button>
        </div>
      </div>
    </div>
  );
}
```

#### Tone

Copy is friendly and non-alarming. Avoid:

- "FATAL ERROR"
- "Your data may be lost"
- Technical jargon

Do use:

- "Something went wrong"
- "We can help you recover"
- Simple instructions

---

## Empty State Design

### 5.1 Empty State Component (Shared)

Reusable component for pages with no data yet.

#### Layout

```
[Container] Centered on page

[Icon] 48×48px, muted color
[Title] Bold, center-aligned
[Description] Small, muted, 2-3 lines max
[CTA Button] (optional) Primary color
```

#### Dimensions

| Element                         | Value                   | Unit | Notes                     |
| ------------------------------- | ----------------------- | ---- | ------------------------- |
| Container height                | 384                     | px   | 24rem, or 60% of viewport |
| Icon size                       | 48                      | px   | Medium prominence         |
| Icon color                      | var(--muted-foreground) | —    | Secondary visual weight   |
| Title size                      | 18                      | px   | 1.125rem, `text-lg`       |
| Title weight                    | 600                     | —    | Semibold                  |
| Description size                | 14                      | px   | 0.875rem                  |
| Description color               | var(--muted-foreground) | —    | Muted                     |
| Description max-width           | 320                     | px   | 20rem, narrow for focus   |
| Spacing (icon to title)         | 16                      | px   | 1rem                      |
| Spacing (title to description)  | 8                       | px   | 0.5rem                    |
| Spacing (description to button) | 16                      | px   | 1rem                      |

#### CSS

```css
.empty-state {
  @apply flex flex-col items-center justify-center min-h-96 py-12 px-4 text-center space-y-4;
}

.empty-state-icon {
  @apply h-12 w-12 text-muted-foreground mx-auto;
}

.empty-state-content {
  @apply space-y-2 max-w-xs;
}

.empty-state-title {
  @apply text-lg font-semibold;
}

.empty-state-description {
  @apply text-sm text-muted-foreground;
}

.empty-state-action {
  @apply mt-4;
}
```

#### JSX Example

```jsx
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="empty-state">
      {Icon && <Icon className="empty-state-icon" />}
      <div className="empty-state-content">
        <h3 className="empty-state-title">{title}</h3>
        {description && (
          <p className="empty-state-description">{description}</p>
        )}
      </div>
      {action && (
        <div className="empty-state-action">
          <Button onClick={action.onClick} variant="outline" size="sm">
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}

// Usage
<EmptyState
  icon={Receipt}
  title="No expenses yet"
  description="Start tracking your spending to see insights"
  action={{
    label: 'Add Your First Expense',
    onClick: () => {
      /* open form */
    },
  }}
/>;
```

### 5.2 Dashboard Empty State (Pre-Onboarding)

When no plan exists, show a welcome state:

```
[Icon] LayoutDashboard (large, 64×64px)
[Title] Welcome to Talliofi
[Description] Set up your financial plan to get started
[Checklist]
  ✓ Define your income and taxes
  ✓ Create budget buckets
  ✓ Track expenses and trends
[Button] Start Setup Wizard (primary, large)
```

#### CSS

```css
.dashboard-empty {
  @apply flex h-full items-center justify-center;
}

.dashboard-empty-card {
  @apply w-full max-w-sm rounded-lg border-2 border-dashed bg-card p-8 text-center space-y-6;
}

.dashboard-empty-icon {
  @apply h-16 w-16 mx-auto text-primary/60;
}

.dashboard-empty-title {
  @apply text-2xl font-bold;
}

.dashboard-empty-description {
  @apply text-sm text-muted-foreground;
}

.dashboard-empty-checklist {
  @apply space-y-3 text-left;
}

.dashboard-empty-checklist-item {
  @apply flex gap-3 items-start;
}

.dashboard-empty-checklist-icon {
  @apply h-5 w-5 text-primary flex-shrink-0 mt-0.5;
}

.dashboard-empty-checklist-text {
  @apply text-sm;
}

.dashboard-empty-button {
  @apply w-full mt-6;
}
```

---

## Save Indicator Design

### 6.1 Save Indicator Component

Displays auto-save status in the page header.

#### States

| State      | Visual                | Duration      | Auto-hide             |
| ---------- | --------------------- | ------------- | --------------------- |
| **idle**   | Hidden                | —             | Yes (never shown)     |
| **saving** | Spinner + "Saving..." | 200ms fade-in | No (shows until done) |
| **saved**  | Checkmark + "Saved"   | 200ms fade-in | Yes (2 seconds)       |
| **error**  | X + "Failed to save"  | 200ms fade-in | Yes (3 seconds)       |

#### Dimensions

| Element                 | Value | Unit | Notes               |
| ----------------------- | ----- | ---- | ------------------- |
| Container height        | 32    | px   | Compact             |
| Container padding       | 8 12  | px   | Vertical Horizontal |
| Container border-radius | 4     | px   | Subtle corners      |
| Icon size               | 16    | px   | Subtle              |
| Text size               | 12    | px   | 0.75rem, `text-xs`  |
| Icon to text gap        | 6     | px   | Close grouping      |

#### CSS

```css
.save-indicator {
  @apply flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-all duration-200;
  min-height: 32px;
}

.save-indicator.hidden {
  @apply opacity-0 pointer-events-none;
}

.save-indicator.saving {
  @apply bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200;
}

.save-indicator.saved {
  @apply bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200;
}

.save-indicator.error {
  @apply bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200;
}

.save-indicator svg {
  @apply h-4 w-4;
}

.save-indicator.saving svg {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
```

#### JSX Example

```jsx
export function SaveIndicator() {
  const saveStatus = useUIStore((state) => state.saveStatus);

  return (
    <div
      className={cn(
        'save-indicator',
        saveStatus === 'idle' && 'hidden',
        saveStatus === 'saving' && 'saving',
        saveStatus === 'saved' && 'saved',
        saveStatus === 'error' && 'error',
      )}
      role="status"
      aria-live="polite"
    >
      {saveStatus === 'saving' && (
        <>
          <Loader2 className="h-4 w-4" />
          <span>Saving...</span>
        </>
      )}
      {saveStatus === 'saved' && (
        <>
          <Check className="h-4 w-4" />
          <span>Saved</span>
        </>
      )}
      {saveStatus === 'error' && (
        <>
          <AlertCircle className="h-4 w-4" />
          <span>Failed to save</span>
        </>
      )}
    </div>
  );
}
```

#### Placement

In the page header, aligned to the right:

```jsx
<div className="page-header">
  <div>
    <h1>{title}</h1>
    {description && <p>{description}</p>}
  </div>
  <SaveIndicator /> {/* Top right */}
</div>
```

---

## Color Variables for Financial Semantics

All colors use OKLch for perceptual uniformity. These are in addition to shadcn's default palette.

### 7.1 Add to `:root` (Light Mode)

Add these CSS variables after the existing color definitions in `src/index.css`:

```css
:root {
  /* Existing chart colors (preserved) */
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);

  /* Financial semantic colors */
  --surplus: oklch(0.62 0.21 142.44); /* Green: positive cash flow */
  --deficit: oklch(0.577 0.245 27.325); /* Red: matches --destructive */
  --neutral: oklch(0.708 0.06 184.704); /* Blue-gray: neutral/pending */
  --warning: oklch(0.706 0.189 70.35); /* Amber: caution/review needed */

  /* Bucket allocation colors (map to chart palette) */
  --bucket-1: oklch(0.646 0.222 41.116); /* Warm orange */
  --bucket-2: oklch(0.6 0.118 184.704); /* Cool blue */
  --bucket-3: oklch(0.398 0.07 227.392); /* Deep indigo */
  --bucket-4: oklch(0.828 0.189 84.429); /* Lime green */
  --bucket-5: oklch(0.769 0.188 70.08); /* Warm gold */
}
```

### 7.2 Add to `.dark` (Dark Mode)

Lighter variants for dark backgrounds:

```css
.dark {
  /* Financial semantic colors */
  --surplus: oklch(0.72 0.21 142.44); /* Lighter green */
  --deficit: oklch(0.704 0.191 22.216); /* Lighter red */
  --neutral: oklch(0.696 0.17 162.48); /* Lighter blue-gray */
  --warning: oklch(0.84 0.19 84.43); /* Lighter amber */

  /* Bucket colors (dark mode variants) */
  --bucket-1: oklch(0.488 0.243 264.376);
  --bucket-2: oklch(0.696 0.17 162.48);
  --bucket-3: oklch(0.769 0.188 70.08);
  --bucket-4: oklch(0.627 0.265 303.9);
  --bucket-5: oklch(0.645 0.246 16.439);
}
```

### 7.3 Usage in Components

#### Surplus Indicator

```jsx
<div className="flex items-center gap-2">
  <div
    className="h-3 w-3 rounded-full"
    style={{ backgroundColor: 'var(--surplus)' }}
  />
  <span style={{ color: 'var(--surplus)' }} className="font-semibold">
    +$1,234.56
  </span>
</div>
```

#### Deficit Indicator

```jsx
<div className="flex items-center gap-2">
  <div
    className="h-3 w-3 rounded-full"
    style={{ backgroundColor: 'var(--deficit)' }}
  />
  <span style={{ color: 'var(--deficit)' }} className="font-semibold">
    −$567.89
  </span>
</div>
```

#### Bucket Color Swatches

```jsx
<div className="flex gap-2">
  {[1, 2, 3, 4, 5].map((idx) => (
    <div
      key={idx}
      className="h-12 w-12 rounded-md border-2 border-border cursor-pointer transition-all hover:shadow-md"
      style={{ backgroundColor: `var(--bucket-${idx})` }}
      onClick={() => selectBucket(idx)}
    />
  ))}
</div>
```

#### Stat Card with Color

```jsx
<div
  className={cn(
    'rounded-lg border p-4 space-y-2',
    variant === 'positive' &&
      'border-l-4 border-l-green-600 bg-green-50 dark:bg-green-950/30',
    variant === 'negative' &&
      'border-l-4 border-l-red-600 bg-red-50 dark:bg-red-950/30',
  )}
  style={{
    '--border-color':
      variant === 'positive' ? 'var(--surplus)' : 'var(--deficit)',
    '--bg-color': variant === 'positive' ? 'var(--surplus)' : 'var(--deficit)',
  }}
>
  <p className="text-sm text-muted-foreground">{label}</p>
  <p
    className="text-2xl font-bold"
    style={{
      color: `var(--${variant === 'positive' ? 'surplus' : 'deficit'})`,
    }}
  >
    {value}
  </p>
</div>
```

### 7.4 Contrast Verification

Before shipping, verify these contrast ratios using axe DevTools or WebAIM:

| Color               | Background     | Foreground | Target | Notes                                      |
| ------------------- | -------------- | ---------- | ------ | ------------------------------------------ |
| `--surplus` (green) | White          | Text       | 4.5:1+ | ✓ Pass if L ≥ 0.62                         |
| `--deficit` (red)   | White          | Text       | 4.5:1+ | ✓ Pass if L ≥ 0.577                        |
| `--neutral` (gray)  | White          | Text       | 4.5:1+ | ✓ Pass if L ≥ 0.708                        |
| `--warning` (amber) | White          | Text       | 4.5:1+ | ✓ Pass if L ≥ 0.706                        |
| Dark mode variants  | Dark bg (#145) | Text       | 4.5:1+ | Higher L values ensure sufficient contrast |

---

## Implementation Checklist

### Phase 2 Deliverables

- [ ] **App Shell** (`src/app/layout.tsx`)
  - [ ] Sidebar (desktop, 256px wide, collapsible to 64px)
  - [ ] Bottom tabs (mobile/tablet, 64px tall)
  - [ ] Main content area with responsive padding
  - [ ] Responsive transition at 1024px breakpoint

- [ ] **Navigation**
  - [ ] 6 nav items (Dashboard, Income, Expenses, Buckets, History, Settings)
  - [ ] Active state styling (sidebar: left border + bg, tabs: color + underline)
  - [ ] Hover states with 150ms transition
  - [ ] Tooltips for collapsed sidebar

- [ ] **Onboarding Wizard** (`src/features/onboarding/`)
  - [ ] Step progress indicator (5 circles + progress bar)
  - [ ] Step 1: Income (input + frequency selector)
  - [ ] Step 2: Taxes (simple/itemized toggle)
  - [ ] Step 3: Buckets (color picker + allocation mode)
  - [ ] Step 4: Expenses (repeating rows, optional)
  - [ ] Step 5: Summary (review all data)
  - [ ] Navigation (Back/Next buttons with proper states)
  - [ ] Step transitions (fade-in animation, 200ms)

- [ ] **Components**
  - [ ] Save indicator (spinning loader, checkmark, error states)
  - [ ] Empty state component (reusable icon + title + description + CTA)
  - [ ] Page header (title + description + save indicator)
  - [ ] Error boundary (error message + recovery actions)

- [ ] **Styling**
  - [ ] Add financial semantic colors to `src/index.css`
  - [ ] Add bucket color palette (5 predefined colors)
  - [ ] Ensure all color contrast meets WCAG AA (4.5:1)
  - [ ] Add transition utilities for 150/200/300ms animations

- [ ] **State Management**
  - [ ] `stores/ui-store.ts` with `sidebarOpen`, `saveStatus`
  - [ ] `hooks/use-active-plan.ts` (TanStack Query hook)
  - [ ] `lib/query-client.ts` configuration

- [ ] **TypeScript**
  - [ ] Strict mode compliance
  - [ ] No unused imports/variables
  - [ ] Proper type exports

---

## Responsive Design Summary

### Breakpoints and Behavior

| Breakpoint | Width          | Navigation         | Content Padding |
| ---------- | -------------- | ------------------ | --------------- |
| Mobile     | < 576px        | Bottom tabs (64px) | 16px            |
| Tablet     | 576px - 1023px | Bottom tabs (64px) | 20px            |
| Desktop    | ≥ 1024px       | Sidebar (256px)    | 24px            |

### Safe Area Handling (Mobile Notches)

For iPhones with notches and other devices with safe areas:

```css
@supports (padding: max(0px)) {
  nav.bottom-tabs {
    padding-bottom: max(0px, env(safe-area-inset-bottom));
  }

  main {
    padding-bottom: max(4rem, env(safe-area-inset-bottom) + 4rem);
  }
}
```

---

## Accessibility Checklist

- [ ] Color contrast: 4.5:1 minimum for all text
- [ ] Focus states: Outline visible on all interactive elements
- [ ] ARIA: `aria-current="page"` on active nav link
- [ ] Labels: All form inputs have `<label>` or `aria-label`
- [ ] Role: Error boundary uses `role="alert"` for accessibility
- [ ] Keyboard: Tab order follows visual flow
- [ ] Motion: Respect `prefers-reduced-motion` media query
- [ ] Touch targets: Minimum 44×44px (nav items are 40px height + padding)

---

## References

- [WCAG 2.1 Color Contrast](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [OKLch Color Space](https://oklch.com/)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [Lucide React Icons](https://lucide.dev/)
