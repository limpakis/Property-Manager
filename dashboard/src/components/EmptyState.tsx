import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const EmptyState = ({ icon: Icon, title, description }: EmptyStateProps) => {
  return (
    <Card className="shadow-card">
      <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <Icon className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold font-display mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-md">{description}</p>
      </CardContent>
    </Card>
  );
};

export default EmptyState;
