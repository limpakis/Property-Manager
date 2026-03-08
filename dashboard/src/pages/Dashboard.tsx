import { Building2, Users, DollarSign, AlertTriangle, CreditCard, TrendingUp, ArrowRight, Wrench, Calendar, Zap, Home } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorMessage } from '@/components/ErrorMessage';
import {
  useDashboardStats,
  useDashboardChartData,
  useProperties,
  useMaintenance,
  usePaymentStats,
} from '@/hooks/usePropertyQueries';

interface DashboardStats {
  totalProperties: number;
  occupiedProperties: number;
  vacancyRate: string;
  totalMonthlyRent: string;
  openMaintenanceRequests: number;
}

interface Property {
  Property_ID: string;
  Address: string;
  Monthly_Rent: string;
  Status: string;
  Tenant_Name?: string;
  Lease_End?: string;
  City?: string;
}

interface MaintenanceRequest {
  Request_ID: string;
  Status: string;
  Priority: string;
  Issue_Description: string;
  Tenant_Name: string;
  Date_Submitted: string;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function computeHealthScore(stats: DashboardStats, urgentCount: number): number {
  let score = 100;
  const occupancy = 100 - parseFloat(stats.vacancyRate);
  if (occupancy < 70) score -= 30;
  else if (occupancy < 85) score -= 15;
  else if (occupancy < 95) score -= 5;
  if (urgentCount > 0) score -= Math.min(20, urgentCount * 5);
  return Math.max(0, Math.min(100, score));
}

const HEALTH_COLORS = ['hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)'];

const DEFAULT_STATS: DashboardStats = {
  totalProperties: 0,
  occupiedProperties: 0,
  vacancyRate: '0',
  totalMonthlyRent: '0.00',
  openMaintenanceRequests: 0,
};

const Dashboard = () => {
  const navigate = useNavigate();

  const { data: stats = DEFAULT_STATS, isLoading: statsLoading, error: statsError } = useDashboardStats();
  const { data: properties = [], isLoading: propertiesLoading } = useProperties();
  const { data: maintenanceRequests = [], isLoading: maintenanceLoading } = useMaintenance();
  const { data: paymentStats = null } = usePaymentStats();
  const { data: chartData = [] } = useDashboardChartData();

  const loading = statsLoading || propertiesLoading || maintenanceLoading;
  const error = statsError
    ? 'Failed to load dashboard data. Please ensure the backend server is running.'
    : null;

  const fallbackChartData = [
    { month: 'Aug', income: 28500, expenses: 12000, profit: 16500 },
    { month: 'Sep', income: 32000, expenses: 14500, profit: 17500 },
    { month: 'Oct', income: 30500, expenses: 13200, profit: 17300 },
    { month: 'Nov', income: 35000, expenses: 15000, profit: 20000 },
    { month: 'Dec', income: 33500, expenses: 14800, profit: 18700 },
    { month: 'Jan', income: 36000, expenses: 15500, profit: 20500 },
    { month: 'Feb', income: 38500, expenses: 16200, profit: 22300 },
  ];

  if (loading) return <LoadingSpinner size="lg" text="Loading dashboard..." />;
  if (error) return <ErrorMessage message={error} />;

  const activeProperties = properties.filter(p => p.Status === 'Active' || p.Status === 'Occupied');
  const urgentRequests = maintenanceRequests.filter(m =>
    m.Status !== 'Completed' && (m.Priority === 'High' || m.Priority === 'Emergency')
  );

  const displayChartData = (chartData && chartData.length > 0) ? chartData : fallbackChartData;

  // NOI: Monthly Rent - estimated operating expenses (30%)
  const monthlyRevenue = parseFloat(stats.totalMonthlyRent) || 0;
  const estimatedExpenses = monthlyRevenue * 0.30;
  const noi = monthlyRevenue - estimatedExpenses;
  const occupancyRate = 100 - parseFloat(stats.vacancyRate);

  // Upcoming lease expirations (within 90 days)
  const upcomingExpirations = properties
    .filter(p => p.Lease_End && p.Tenant_Name)
    .map(p => ({ ...p, daysLeft: daysUntil(p.Lease_End!) }))
    .filter(p => p.daysLeft >= 0 && p.daysLeft <= 90)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 4);

  // Health score
  const healthScore = computeHealthScore(stats, urgentRequests.length);
  const healthLabel = healthScore >= 85 ? 'Excellent' : healthScore >= 70 ? 'Good' : healthScore >= 50 ? 'Fair' : 'Needs Attention';
  const healthColor = healthScore >= 85 ? 'text-success' : healthScore >= 70 ? 'text-primary' : healthScore >= 50 ? 'text-warning' : 'text-destructive';

  // Top properties by rent
  const topProperties = [...activeProperties]
    .sort((a, b) => parseFloat(b.Monthly_Rent || '0') - parseFloat(a.Monthly_Rent || '0'))
    .slice(0, 5);

  const healthPieData = [
    { name: 'Score', value: healthScore },
    { name: 'Gap', value: 100 - healthScore },
  ];
  const healthPieColor = healthScore >= 85 ? 'hsl(142, 71%, 45%)' : healthScore >= 70 ? 'hsl(25, 95%, 53%)' : healthScore >= 50 ? 'hsl(38, 92%, 50%)' : 'hsl(0, 84%, 60%)';

  return (
    <div className="space-y-6 animate-fade-in gradient-mesh min-h-full pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight">
            {getGreeting()} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Here's your portfolio overview for today
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/reports')} className="gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            View Reports
          </Button>
          <Button size="sm" onClick={() => navigate('/properties')} className="gap-1.5 gradient-primary text-white border-0 shadow-glow-primary">
            <Home className="h-3.5 w-3.5" />
            Manage Properties
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        <div className="animate-slide-up stagger-1">
          <StatCard
            title="Total Properties"
            value={stats.totalProperties.toString()}
            subtitle={`${stats.occupiedProperties} occupied`}
            icon={Building2}
            variant="primary"
          />
        </div>
        <div className="animate-slide-up stagger-2">
          <StatCard
            title="Occupancy Rate"
            value={`${occupancyRate.toFixed(0)}%`}
            subtitle={`${stats.vacancyRate}% vacancy`}
            icon={Users}
            variant={occupancyRate >= 90 ? 'success' : occupancyRate >= 75 ? 'default' : 'warning'}
            trend={occupancyRate >= 90 ? { value: 'Above target', positive: true } : undefined}
          />
        </div>
        <div className="animate-slide-up stagger-3">
          <StatCard
            title="Monthly Revenue"
            value={`$${monthlyRevenue.toLocaleString()}`}
            subtitle="From occupied units"
            icon={DollarSign}
            variant="default"
            trend={{ value: '+4.2% vs last month', positive: true }}
          />
        </div>
        <div className="animate-slide-up stagger-4">
          <StatCard
            title={paymentStats ? 'Payments Collected' : 'Net Op. Income'}
            value={paymentStats ? `$${paymentStats.net_revenue.toLocaleString()}` : `$${noi.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            subtitle={paymentStats ? `${paymentStats.completed_payments} payments` : 'Est. after expenses'}
            icon={CreditCard}
            variant="success"
          />
        </div>
        <div className="animate-slide-up stagger-5">
          <StatCard
            title="Open Maintenance"
            value={stats.openMaintenanceRequests.toString()}
            subtitle={urgentRequests.length > 0 ? `${urgentRequests.length} urgent` : 'All under control'}
            icon={AlertTriangle}
            variant={urgentRequests.length > 0 ? 'destructive' : 'default'}
          />
        </div>
      </div>

      {/* Main grid */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Cash Flow Chart */}
        <Card className="lg:col-span-2 shadow-card glass-card animate-slide-up">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-base">Cash Flow Trend</CardTitle>
              <Badge variant="outline" className="text-xs font-normal">Last 7 months</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={displayChartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(220, 9%, 46%)" axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(220, 9%, 46%)" tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} width={48} />
                <Tooltip
                  formatter={(value: number, name: string) => [`$${value.toLocaleString()}`, name]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid hsl(220, 13%, 91%)', fontSize: 12 }}
                />
                <Area type="monotone" dataKey="income" name="Income" stroke="hsl(25, 95%, 53%)" fill="url(#incomeGrad)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="profit" name="Net Profit" stroke="hsl(142, 71%, 45%)" fill="url(#profitGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Portfolio Health Score */}
        <Card className="shadow-card glass-card animate-slide-up">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">Portfolio Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <PieChart width={140} height={140}>
                  <Pie
                    data={healthPieData}
                    cx={65}
                    cy={65}
                    startAngle={90}
                    endAngle={-270}
                    innerRadius={48}
                    outerRadius={62}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    <Cell fill={healthPieColor} />
                    <Cell fill="hsl(220, 13%, 91%)" />
                  </Pie>
                </PieChart>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-2xl font-bold ${healthColor}`}>{healthScore}</span>
                  <span className="text-xs text-muted-foreground">/ 100</span>
                </div>
              </div>
              <div className="text-center">
                <p className={`text-base font-bold ${healthColor}`}>{healthLabel}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Portfolio health score</p>
              </div>
              <div className="w-full space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Occupancy</span>
                  <span className={`font-semibold ${occupancyRate >= 90 ? 'text-success' : occupancyRate >= 75 ? 'text-warning' : 'text-destructive'}`}>
                    {occupancyRate.toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Open maintenance</span>
                  <span className={`font-semibold ${urgentRequests.length === 0 ? 'text-success' : 'text-destructive'}`}>
                    {stats.openMaintenanceRequests} ({urgentRequests.length} urgent)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Monthly NOI</span>
                  <span className="font-semibold text-foreground">${noi.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom grid */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {/* Top Properties */}
        <Card className="shadow-card glass-card animate-slide-up">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-base">Top Properties</CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => navigate('/properties')}>
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {topProperties.length > 0 ? topProperties.map((property, i) => (
              <div key={property.Property_ID} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group" onClick={() => navigate(`/properties`)}>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">
                  #{i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{property.Address}</p>
                  <p className="text-xs text-muted-foreground truncate">{property.Tenant_Name || 'Vacant'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold">${parseFloat(property.Monthly_Rent || '0').toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">/mo</p>
                </div>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground text-center py-6">No active properties</p>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Lease Expirations */}
        <Card className="shadow-card glass-card animate-slide-up">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Lease Expirations
              </CardTitle>
              <Badge variant="outline" className="text-xs">Next 90 days</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingExpirations.length > 0 ? (
              <div className="space-y-2">
                {upcomingExpirations.map((property) => (
                  <div key={property.Property_ID} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer" onClick={() => navigate('/properties')}>
                    <div className={`h-2 w-2 rounded-full shrink-0 ${property.daysLeft <= 14 ? 'bg-destructive animate-pulse' : property.daysLeft <= 30 ? 'bg-warning' : 'bg-success'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{property.Address}</p>
                      <p className="text-xs text-muted-foreground">{property.Tenant_Name}</p>
                    </div>
                    <Badge variant={property.daysLeft <= 14 ? 'destructive' : property.daysLeft <= 30 ? 'outline' : 'secondary'} className="shrink-0 text-xs">
                      {property.daysLeft === 0 ? 'Today' : `${property.daysLeft}d`}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Calendar className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No leases expiring soon</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">All leases are up to date</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions + Urgent Maintenance */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <Card className="shadow-card glass-card animate-slide-up">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {[
                { label: 'Add Property', icon: Building2, path: '/properties' },
                { label: 'Add Tenant', icon: Users, path: '/tenants' },
                { label: 'Log Expense', icon: CreditCard, path: '/expenses' },
                { label: 'View Reports', icon: TrendingUp, path: '/reports' },
              ].map(({ label, icon: Icon, path }) => (
                <button
                  key={label}
                  onClick={() => navigate(path)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/40 hover:bg-primary/10 hover:text-primary transition-all duration-200 text-center group border border-transparent hover:border-primary/20"
                >
                  <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">{label}</span>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Urgent Maintenance Compact */}
          {urgentRequests.length > 0 && (
            <Card className="shadow-card border-destructive/30 bg-destructive/5 animate-slide-up">
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-sm flex items-center gap-2 text-destructive">
                  <Wrench className="h-3.5 w-3.5" />
                  Urgent Maintenance ({urgentRequests.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {urgentRequests.slice(0, 2).map((req) => (
                  <div key={req.Request_ID} className="text-xs p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="font-medium text-destructive truncate">{req.Issue_Description}</p>
                    <p className="text-muted-foreground mt-0.5">{req.Tenant_Name} · {req.Priority}</p>
                  </div>
                ))}
                {urgentRequests.length > 2 && (
                  <p className="text-xs text-muted-foreground text-center">+{urgentRequests.length - 2} more</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
