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
import { ErrorBoundary } from '@/components/feedback/error-boundary';
import { EncryptionLockScreen } from '@/components/feedback/encryption-lock-screen';
import { KeyboardShortcutsDialog } from '@/components/feedback/keyboard-shortcuts-dialog';
import { QuickAddFab } from '@/components/quick-add';

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Income', to: '/income', icon: DollarSign },
  { label: 'Taxes', to: '/taxes', icon: Receipt },
  { label: 'Buckets', to: '/buckets', icon: PieChart },
  { label: 'Expenses', to: '/expenses', icon: CreditCard },
  { label: 'Goals', to: '/goals', icon: Target },
  { label: 'Net Worth', to: '/net-worth', icon: Landmark },
  { label: 'History', to: '/history', icon: Clock },
  { label: 'Reports', to: '/reports', icon: FileBarChart },
  { label: 'Settings', to: '/settings', icon: Settings },
] as const;

/** Bottom tab items for mobile -- 5 most important */
const BOTTOM_NAV_ITEMS: readonly NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
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
          !prefersReducedMotion && 'animate-spin',
        )}
        aria-hidden="true"
      />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" aria-label="Main navigation">
      <SidebarHeader>
        <div className="flex h-8 items-center gap-2 px-2">
          <div
            className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md text-xs font-bold"
            aria-hidden="true"
          >
            T
          </div>
          <span className="text-sm font-semibold group-data-[collapsible=icon]:hidden">
            Talliofi
          </span>
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
                    <SidebarMenuButton asChild tooltip={item.label}>
                      <NavLink
                        to={item.to}
                        className={isActive ? 'font-medium' : ''}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <item.icon
                          className={cn(
                            'size-4',
                            isActive && 'text-sidebar-primary',
                          )}
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
      className="bg-background border-t md:hidden"
      aria-label="Mobile navigation"
    >
      {/* Ensure minimum touch target size of 44x44px for all nav items */}
      <div className="flex h-16 items-center justify-around">
        {BOTTOM_NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                // Minimum touch target: 44x44px
                'flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 px-2 py-1 text-xs transition-colors',
                isActive ? 'text-primary font-medium' : 'text-muted-foreground',
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
            !prefersReducedMotion && 'animate-spin',
          )}
          aria-hidden="true"
        />
        <span className="sr-only">Loading application...</span>
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
          <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4 md:hidden">
            <SidebarTrigger className="-ml-1" aria-label="Toggle sidebar" />
            <Separator
              orientation="vertical"
              className="mr-2 h-4"
              aria-hidden="true"
            />
            <span className="text-sm font-semibold">Talliofi</span>
          </header>
          <div className="flex flex-1 flex-col overflow-hidden">
            <main
              id={MAIN_CONTENT_ID}
              className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6"
              tabIndex={-1}
            >
              <ErrorBoundary>
                <Suspense fallback={<LoadingFallback />}>
                  <Outlet />
                </Suspense>
              </ErrorBoundary>
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
