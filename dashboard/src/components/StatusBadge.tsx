import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status: 'paid' | 'pending' | 'overdue' | 'unpaid';
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles = {
    paid: 'bg-success/10 text-success border-success/20 hover:bg-success/15',
    pending: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/15',
    overdue: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/15',
    unpaid: 'bg-muted text-muted-foreground border-muted hover:bg-muted',
  };

  return (
    <Badge variant="outline" className={`${styles[status]} capitalize font-medium text-xs`}>
      {status}
    </Badge>
  );
}
