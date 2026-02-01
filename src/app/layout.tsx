import { Suspense } from 'react';
import { Navigate, NavLink, Outlet } from 'react-router';
import {
  LayoutDashboard,
  DollarSign,
  Receipt,
  PieChart,
  CreditCard,
  Clock,
  Settings,
  Loader2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useActivePlan } from '@/hooks/use-active-plan';
import { useAutoSnapshot } from '@/hooks/use-auto-snapshot';
import { cn } from '@/lib/utils';
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
  { label: 'History', to: '/history', icon: Clock },
  { label: 'Settings', to: '/settings', icon: Settings },
] as const;

/** Bottom tab items for mobile -- 5 most important */
const BOTTOM_NAV_ITEMS: readonly NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Buckets', to: '/buckets', icon: PieChart },
  { label: 'Expenses', to: '/expenses', icon: CreditCard },
  { label: 'History', to: '/history', icon: Clock },
  { label: 'Settings', to: '/settings', icon: Settings },
] as const;

function LoadingFallback() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Loader2 className="text-muted-foreground size-6 animate-spin" />
    </div>
  );
}

function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex h-8 items-center gap-2 px-2">
          <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md text-xs font-bold">
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
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild tooltip={item.label}>
                    <NavLink
                      to={item.to}
                      className={({ isActive }) =>
                        isActive ? 'font-medium' : ''
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon
                            className={cn(
                              'size-4',
                              isActive && 'text-sidebar-primary',
                            )}
                          />
                          <span>{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

function MobileBottomNav() {
  return (
    <nav
      className="bg-background border-t md:hidden"
      aria-label="Mobile navigation"
    >
      <div className="flex h-16 items-center justify-around">
        {BOTTOM_NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors',
                isActive ? 'text-primary font-medium' : 'text-muted-foreground',
              )
            }
          >
            <item.icon className="size-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export default function AppLayout() {
  const { data: plan, isLoading } = useActivePlan();
  useAutoSnapshot();

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="text-muted-foreground size-8 animate-spin" />
      </div>
    );
  }

  if (!plan) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4 md:hidden">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm font-semibold">Talliofi</span>
        </header>
        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6">
            <ErrorBoundary>
              <Suspense fallback={<LoadingFallback />}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </main>
          <MobileBottomNav />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
