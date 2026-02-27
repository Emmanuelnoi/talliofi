import { Suspense, useEffect } from 'react';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router';
import {
  LayoutDashboard,
  DollarSign,
  Receipt,
  PieChart,
  CreditCard,
  Target,
  Landmark,
  Clock,
  FileBarChart,
  Settings,
  Loader2,
  Layers,
  BookOpen,
  Sun,
  Moon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useActivePlan } from '@/hooks/use-active-plan';
import { useAutoSnapshot } from '@/hooks/use-auto-snapshot';
import { useGlobalShortcuts } from '@/hooks/use-global-shortcuts';
import { useLocalEncryption } from '@/hooks/use-local-encryption';
import { useSessionTimeout } from '@/hooks/use-session-timeout';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { cn } from '@/lib/utils';
import { useCurrencyStore } from '@/stores/currency-store';
import { DEFAULT_CURRENCY } from '@/domain/money';
import { SkipLink, LiveRegion } from '@/components/accessibility';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ErrorBoundary } from '@/components/feedback/error-boundary';
import { EncryptionLockScreen } from '@/components/feedback/encryption-lock-screen';
import { KeyboardShortcutsDialog } from '@/components/feedback/keyboard-shortcuts-dialog';
import { QuickAddFab } from '@/components/quick-add';
import { DEMO_PLAN_ID } from '@/features/demo/lib/ensure-demo-plan';
import { useTheme } from '@/features/settings/hooks/use-theme';
import { Button } from '@/components/ui/button';

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Income', to: '/income', icon: DollarSign },
  { label: 'Taxes', to: '/taxes', icon: Receipt },
  { label: 'Buckets', to: '/buckets', icon: PieChart },
  { label: 'Expenses', to: '/expenses', icon: CreditCard },
  { label: 'Goals', to: '/goals', icon: Target },
  { label: 'Net Worth', to: '/net-worth', icon: Landmark },
  { label: 'History', to: '/history', icon: Clock },
  { label: 'Reports', to: '/reports', icon: FileBarChart },
  { label: 'Settings', to: '/settings', icon: Settings },
  { label: 'Help', to: '/help', icon: BookOpen },
] as const;

/** Bottom tab items for mobile -- 5 most important */
const BOTTOM_NAV_ITEMS: readonly NavItem[] = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Expenses', to: '/expenses', icon: CreditCard },
  { label: 'Goals', to: '/goals', icon: Target },
  { label: 'History', to: '/history', icon: Clock },
  { label: 'Settings', to: '/settings', icon: Settings },
] as const;

/** Main content area ID for skip link navigation */
const MAIN_CONTENT_ID = 'main-content';

function LoadingFallback() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      className="flex flex-1 items-center justify-center"
      role="status"
      aria-label="Loading page content"
    >
      <Loader2
        className={cn(
          'text-muted-foreground size-6',
          !prefersReducedMotion && 'motion-safe:animate-spin',
        )}
        aria-hidden="true"
      />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" aria-label="Main navigation">
      <SidebarHeader>
        <div className="flex items-center gap-3 px-2">
          <div
            className="bg-foreground text-background flex size-7 items-center justify-center rounded-lg text-xs font-semibold"
            aria-hidden="true"
          >
            T
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.2em]">
              Talliofi
            </p>
            <p className="text-sm font-semibold tracking-tight">Planner</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const isActive = location.pathname === item.to;
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                    >
                      <NavLink
                        to={item.to}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <item.icon
                          className={cn('size-4', isActive && 'text-primary')}
                          aria-hidden="true"
                        />
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav
      className="bg-background/80 border-border/60 sticky bottom-0 border-t backdrop-blur md:hidden"
      aria-label="Mobile navigation"
    >
      {/* Ensure minimum touch target size of 44x44px for all nav items */}
      <div className="flex h-16 items-center justify-around px-2">
        {BOTTOM_NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                // Minimum touch target: 44x44px
                'flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors',
                isActive ? 'text-foreground' : 'text-muted-foreground',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon className="size-5" aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

function ThemeToggleButton() {
  const { theme, setTheme } = useTheme();
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? (
        <Sun className="size-4" aria-hidden="true" />
      ) : (
        <Moon className="size-4" aria-hidden="true" />
      )}
    </Button>
  );
}

export default function AppLayout() {
  const { enabled, isLocked, unlock, isBusy, error } = useLocalEncryption();
  const { data: plan, isLoading } = useActivePlan();
  const setCurrencyCode = useCurrencyStore((s) => s.setCurrencyCode);
  const prefersReducedMotion = useReducedMotion();
  const { isShortcutsDialogOpen, setShortcutsDialogOpen } =
    useGlobalShortcuts();
  useAutoSnapshot();
  useSessionTimeout();

  useEffect(() => {
    const currency = plan?.currencyCode ?? DEFAULT_CURRENCY;
    setCurrencyCode(currency);
  }, [plan?.currencyCode, setCurrencyCode]);

  if (enabled && isLocked) {
    return (
      <EncryptionLockScreen onUnlock={unlock} isBusy={isBusy} error={error} />
    );
  }

  if (isLoading) {
    return (
      <div
        className="flex min-h-svh items-center justify-center"
        role="status"
        aria-label="Loading application"
      >
        <Loader2
          className={cn(
            'text-muted-foreground size-8',
            !prefersReducedMotion && 'motion-safe:animate-spin',
          )}
          aria-hidden="true"
        />
        <span className="sr-only">Loading application…</span>
      </div>
    );
  }

  if (!plan) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <>
      {/* Global accessibility components */}
      <SkipLink targetId={MAIN_CONTENT_ID} />
      <LiveRegion />

      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="border-border/60 bg-background/80 sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-4 border-b px-6 backdrop-blur">
            <div className="flex items-center gap-3">
              <SidebarTrigger aria-label="Toggle sidebar" />
              <Separator orientation="vertical" className="h-5" />
              <div>
                <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.2em]">
                  Active plan
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold tracking-tight">
                    {plan.name}
                  </p>
                  {plan.id === DEMO_PLAN_ID && (
                    <Badge
                      variant="destructive"
                      className="h-5 px-2 text-[10px]"
                    >
                      Demo Mode
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggleButton />
              <NavLink to="/plans" className="shrink-0">
                <span className="text-muted-foreground inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]">
                  <Layers className="size-4" aria-hidden="true" />
                  Plans
                </span>
              </NavLink>
            </div>
          </header>
          <div className="flex flex-1 flex-col overflow-hidden">
            <main
              id={MAIN_CONTENT_ID}
              className="flex-1 overflow-y-auto px-6 pb-24 pt-6 md:px-8"
              tabIndex={-1}
            >
              <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <Outlet />
                  </Suspense>
                </ErrorBoundary>
              </div>
            </main>
            <MobileBottomNav />
          </div>
        </SidebarInset>
        {/* Quick Add FAB - available on all pages within app shell */}
        <QuickAddFab />
      </SidebarProvider>

      {/* Keyboard shortcuts help dialog (Cmd+/) */}
      <KeyboardShortcutsDialog
        open={isShortcutsDialogOpen}
        onOpenChange={setShortcutsDialogOpen}
      />
    </>
  );
}
