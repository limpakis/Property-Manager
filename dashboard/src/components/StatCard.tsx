import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive';
}

const variantStyles = {
  default: 'bg-card border border-border/60',
  primary: 'bg-card border border-primary/20',
  success: 'bg-card border border-success/20',
  warning: 'bg-card border border-warning/20',
  destructive: 'bg-card border border-destructive/20',
};

const iconVariantStyles = {
  default: 'bg-muted text-muted-foreground',
  primary: 'gradient-primary text-white shadow-glow-primary',
  success: 'gradient-success text-white shadow-glow-success',
  warning: 'bg-warning text-white',
  destructive: 'bg-destructive text-white',
};

const accentBarStyles = {
  default: 'bg-muted',
  primary: 'gradient-primary',
  success: 'gradient-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
};

export function StatCard({ title, value, subtitle, icon: Icon, trend, variant = 'default' }: StatCardProps) {
  return (
    <Card className={`${variantStyles[variant]} shadow-card hover:shadow-card-hover transition-all duration-300 animate-fade-in overflow-hidden relative group card-shine`}>
      {/* Top accent bar */}
      <div className={`h-1 w-full ${accentBarStyles[variant]}`} />
      <CardContent className="p-5 relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold tracking-tight animate-count-up leading-none">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
            )}
            {trend && (
              <div className={`flex items-center gap-1 text-xs font-semibold mt-1 ${trend.positive ? 'text-success' : 'text-destructive'}`}>
                {trend.positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {trend.value}
              </div>
            )}
          </div>
          <div className={`${iconVariantStyles[variant]} flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
      {/* Subtle decorative bg icon */}
      <div className="absolute -right-2 -bottom-2 opacity-[0.04] pointer-events-none select-none">
        <Icon className="h-24 w-24" strokeWidth={1} />
      </div>
    </Card>
  );
}
