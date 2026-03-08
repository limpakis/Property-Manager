import { Building2, Users, CreditCard, Receipt, BarChart3, Bell, LayoutDashboard, Settings, LogOut, Calculator, TrendingUp } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';

const navItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Properties', url: '/properties', icon: Building2 },
  { title: 'Tenants', url: '/tenants', icon: Users },
  { title: 'Payments', url: '/payments', icon: CreditCard },
  { title: 'Expenses', url: '/expenses', icon: Receipt },
  { title: 'Reports', url: '/reports', icon: BarChart3 },
  { title: 'Notifications', url: '/notifications', icon: Bell },
  { title: 'ROI Calculator', url: '/roi-calculator', icon: Calculator },
  { title: 'Settings', url: '/settings', icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { account, user, logout } = useAuth();

  const tierLabel = account?.subscription_tier ? 
    account.subscription_tier.charAt(0).toUpperCase() + account.subscription_tier.slice(1) + ' Plan' : 'Free Plan';
  const statusLabel = account?.subscription_status === 'trial' ? 'Trial' : tierLabel;

  const propertyCount = account?.current_property_count || 0;
  const propertyLimit = account?.property_limit === -1 ? null : (account?.property_limit || 10);
  const usagePct = propertyLimit ? Math.min(100, (propertyCount / propertyLimit) * 100) : 0;

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-0">
        {!collapsed ? (
          <div className="animate-slide-in relative">
            <img
              src="/branding/logo-monochrome-white.svg"
              alt="TrueNorth PM"
              className="w-full h-auto block"
            />
            {/* gradient fade blending image into sidebar background */}
            <div
              className="absolute inset-x-0 bottom-0 h-16 pointer-events-none"
              style={{ background: 'linear-gradient(to bottom, transparent, hsl(207, 18%, 52%))' }}
            />
            <div className="absolute bottom-2 left-3">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-black/20 text-white">
                {statusLabel}
              </span>
            </div>
          </div>
        ) : (
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: '1 / 1' }}>
            <img
              src="/branding/extracted-1.jpg"
              alt="TrueNorth PM"
              style={{
                position: 'absolute',
                width: '200%',
                height: '200%',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                objectFit: 'cover',
              }}
            />
            {/* Radial vignette overlay that blends edges into sidebar colour */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse 60% 60% at 50% 50%, transparent 30%, hsl(207,18%,52%) 80%)',
              }}
            />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-muted text-[10px] uppercase tracking-widest font-semibold px-3 mb-1">
            {!collapsed && 'Navigation'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = item.url === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <NavLink
                        to={item.url}
                        end={item.url === '/'}
                        className="transition-all duration-150 rounded-lg"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        {!collapsed && (
          <div className="space-y-2">
            {/* Usage bar */}
            {propertyLimit !== null && (
              <div className="rounded-xl bg-sidebar-accent p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-sidebar-accent-foreground">{user?.full_name || user?.email}</p>
                  <TrendingUp className="h-3 w-3 text-primary" />
                </div>
                <div className="flex items-center justify-between text-[11px] text-sidebar-muted">
                  <span>{propertyCount} properties</span>
                  <span>{propertyLimit ? `of ${propertyLimit}` : '∞'}</span>
                </div>
                <div className="h-1.5 rounded-full bg-sidebar-background overflow-hidden">
                  <div
                    className="h-full rounded-full gradient-primary transition-all duration-500"
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
              </div>
            )}
            {propertyLimit === null && (
              <div className="rounded-xl bg-sidebar-accent p-3">
                <p className="text-xs font-semibold text-sidebar-accent-foreground truncate">{user?.full_name || user?.email}</p>
                <p className="text-[11px] text-sidebar-muted mt-0.5">{propertyCount} properties · Unlimited</p>
              </div>
            )}
            <button
              onClick={logout}
              className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-xs text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        )}
        {collapsed && (
          <button
            onClick={logout}
            className="flex items-center justify-center w-full rounded-lg p-2 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
