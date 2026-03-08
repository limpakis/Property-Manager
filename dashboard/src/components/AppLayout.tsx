import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Bell, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/properties': 'Properties',
  '/tenants': 'Tenants',
  '/payments': 'Payments',
  '/expenses': 'Expenses',
  '/reports': 'Reports',
  '/notifications': 'Notifications',
  '/settings': 'Settings',
  '/roi-calculator': 'ROI Calculator',
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { account } = useAuth();
  const location = useLocation();
  
  const trialDaysLeft = account?.subscription_status === 'trial' && account?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(account.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const pageTitle = Object.entries(PAGE_TITLES).find(([path]) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
  )?.[1] ?? '';

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <header className="flex h-14 items-center justify-between border-b bg-card/80 backdrop-blur-sm px-4 sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              {pageTitle && (
                <span className="text-sm font-semibold text-muted-foreground hidden sm:block">{pageTitle}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {trialDaysLeft !== null && (
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-warning/40 text-warning hover:bg-warning/5" asChild>
                  <Link to="/settings">
                    <Zap className="h-3 w-3" />
                    {trialDaysLeft}d left — Upgrade
                  </Link>
                </Button>
              )}
              {account?.subscription_status === 'past_due' && (
                <Button variant="destructive" size="sm" className="h-8 text-xs" asChild>
                  <Link to="/settings">Payment overdue</Link>
                </Button>
              )}
              <Link to="/notifications" className="relative p-1.5 rounded-lg hover:bg-muted transition-colors">
                <Bell className="h-4.5 w-4.5 text-muted-foreground" />
                <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-destructive border border-background animate-pulse" />
              </Link>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
