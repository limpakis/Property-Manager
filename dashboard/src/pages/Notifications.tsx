import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Calendar, Wrench, CheckCircle, DollarSign, Home, User, ExternalLink } from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/EmptyState';
import { ErrorMessage } from '@/components/ErrorMessage';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface Notification {
  id: string;
  type: 'error' | 'warning';
  title: string;
  description: string;
  date: string;
  icon: typeof AlertTriangle;
  details?: {
    tenantName?: string;
    monthlyRent?: number;
    leaseEnd?: string;
    daysUntilExpiry?: number;
    priority?: string;
    issueDescription?: string;
    dateSubmitted?: string;
    status?: string;
    propertyId?: string;
  };
}

interface Property {
  Property_ID: string;
  Lease_End: string;
  Status: string;
  Tenant_Name: string;
  Monthly_Rent: number;
}

interface Maintenance {
  Status: string;
  Priority: string;
  Issue_Description: string;
  Tenant_Name: string;
  Date_Submitted: string;
}

const typeConfig = {
  error: { color: 'text-destructive', bg: 'bg-destructive/10' },
  warning: { color: 'text-warning', bg: 'bg-warning/10' },
};

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch both endpoints in parallel
        const [properties, maintenanceRequests] = await Promise.all([
          api.getProperties() as Promise<Property[]>,
          api.getMaintenance() as Promise<Maintenance[]>,
        ]);

        const generatedNotifications: Notification[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Process lease expiration notifications
        properties.forEach((property, index) => {
          if (property.Lease_End && property.Status !== 'Vacant') {
            const leaseEndDate = new Date(property.Lease_End);
            leaseEndDate.setHours(0, 0, 0, 0);
            const daysUntilExpiry = Math.ceil((leaseEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            if (daysUntilExpiry < 0) {
              // Lease already expired
              generatedNotifications.push({
                id: `lease-expired-${index}`,
                type: 'error',
                title: 'Lease Expired',
                description: `${property.Tenant_Name}'s lease expired ${Math.abs(daysUntilExpiry)} days ago`,
                date: property.Lease_End,
                icon: AlertTriangle,
                details: {
                  tenantName: property.Tenant_Name,
                  monthlyRent: property.Monthly_Rent,
                  leaseEnd: property.Lease_End,
                  daysUntilExpiry,
                  status: property.Status,
                  propertyId: property.Property_ID,
                },
              });
            } else if (daysUntilExpiry <= 60) {
              // Lease expiring within 60 days
              generatedNotifications.push({
                id: `lease-expiring-${index}`,
                type: 'warning',
                title: 'Lease Expiring Soon',
                description: `${property.Tenant_Name}'s lease expires in ${daysUntilExpiry} days`,
                date: property.Lease_End,
                icon: Calendar,
                details: {
                  tenantName: property.Tenant_Name,
                  monthlyRent: property.Monthly_Rent,
                  leaseEnd: property.Lease_End,
                  daysUntilExpiry,
                  status: property.Status,
                  propertyId: property.Property_ID,
                },
              });
            }
          }
        });

        // Process maintenance notifications
        maintenanceRequests.forEach((request, index) => {
          if (request.Status !== 'Completed' && request.Status !== 'Closed') {
            const isHighPriority = request.Priority === 'High' || request.Priority === 'Urgent';
            
            generatedNotifications.push({
              id: `maintenance-${index}`,
              type: isHighPriority ? 'error' : 'warning',
              title: isHighPriority ? 'Urgent Maintenance Request' : 'Maintenance Request',
              description: `${request.Tenant_Name}: ${request.Issue_Description}`,
              date: request.Date_Submitted,
              icon: Wrench,
              details: {
                tenantName: request.Tenant_Name,
                priority: request.Priority,
                issueDescription: request.Issue_Description,
                dateSubmitted: request.Date_Submitted,
                status: request.Status,
              },
            });
          }
        });

        // Sort by date (newest first)
        generatedNotifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setNotifications(generatedNotifications);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load notifications');
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <div className="space-y-6 animate-fade-in gradient-mesh min-h-full pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight">Notifications</h1>
          <p className="text-muted-foreground text-sm mt-1">Stay on top of important alerts across your portfolio</p>
        </div>
        <div className="flex items-center gap-2">
          {notifications.filter(n => n.type === 'error').length > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {notifications.filter(n => n.type === 'error').length} critical
            </Badge>
          )}
          <Badge variant="outline" className="gap-1">
            {notifications.length} total
          </Badge>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-lg">All Clear!</h3>
            <p className="text-muted-foreground text-sm mt-1">No urgent alerts or notifications at this time.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif, idx) => {
            const config = typeConfig[notif.type];
            const Icon = notif.icon;
            return (
              <Card
                key={notif.id}
                className={`shadow-card hover:shadow-card-hover transition-all duration-200 cursor-pointer group animate-slide-up glass-card overflow-hidden`}
                style={{ animationDelay: `${idx * 0.04}s` }}
                onClick={() => setSelectedNotification(notif)}
              >
                <div className={`h-0.5 w-full ${notif.type === 'error' ? 'bg-destructive' : 'bg-warning'}`} />
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${config.bg} transition-transform duration-200 group-hover:scale-110`}>
                    <Icon className={`h-5 w-5 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold">{notif.title}</p>
                      <Badge
                        variant={notif.type === 'error' ? 'destructive' : 'outline'}
                        className="text-[10px] py-0 h-4 hidden sm:inline-flex"
                      >
                        {notif.type === 'error' ? 'Critical' : 'Warning'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{notif.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(notif.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 transition-colors" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Notification Details Modal */}
      <Dialog open={!!selectedNotification} onOpenChange={() => setSelectedNotification(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedNotification && (
                <>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    typeConfig[selectedNotification.type].bg
                  }`}>
                    {selectedNotification.icon && (
                      <selectedNotification.icon className={`h-5 w-5 ${
                        typeConfig[selectedNotification.type].color
                      }`} />
                    )}
                  </div>
                  <span>{selectedNotification.title}</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedNotification?.details && (
            <div className="space-y-4 mt-4">
              {/* Lease-related details */}
              {selectedNotification.details.tenantName && selectedNotification.details.leaseEnd && (
                <>
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Tenant</p>
                      <p className="text-sm text-muted-foreground">{selectedNotification.details.tenantName}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Lease End Date</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(selectedNotification.details.leaseEnd).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                      {selectedNotification.details.daysUntilExpiry !== undefined && (
                        <p className={`text-xs font-medium mt-1 ${
                          selectedNotification.details.daysUntilExpiry < 0 ? 'text-destructive' : 'text-warning'
                        }`}>
                          {selectedNotification.details.daysUntilExpiry < 0 
                            ? `Expired ${Math.abs(selectedNotification.details.daysUntilExpiry)} days ago`
                            : `Expires in ${selectedNotification.details.daysUntilExpiry} days`
                          }
                        </p>
                      )}
                    </div>
                  </div>

                  {selectedNotification.details.monthlyRent && (
                    <div className="flex items-start gap-3">
                      <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Monthly Rent</p>
                        <p className="text-sm text-muted-foreground">
                          ${selectedNotification.details.monthlyRent.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t mt-4">
                    <Button 
                      onClick={() => {
                        if (selectedNotification?.details?.propertyId) {
                          navigate(`/properties/${selectedNotification.details.propertyId}`);
                        } else {
                          navigate('/properties');
                        }
                        setSelectedNotification(null);
                      }}
                      className="w-full gap-2"
                    >
                      <Home className="h-4 w-4" />
                      View Property Details
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}

              {/* Maintenance-related details */}
              {selectedNotification.details.issueDescription && (
                <>
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Reported By</p>
                      <p className="text-sm text-muted-foreground">{selectedNotification.details.tenantName}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Wrench className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Issue Description</p>
                      <p className="text-sm text-muted-foreground">{selectedNotification.details.issueDescription}</p>
                    </div>
                  </div>

                  {selectedNotification.details.priority && (
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Priority Level</p>
                        <Badge 
                          variant={selectedNotification.details.priority === 'High' || selectedNotification.details.priority === 'Urgent' ? 'destructive' : 'outline'}
                          className="mt-1"
                        >
                          {selectedNotification.details.priority}
                        </Badge>
                      </div>
                    </div>
                  )}

                  {selectedNotification.details.status && (
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Status</p>
                        <Badge variant="outline" className="mt-1">{selectedNotification.details.status}</Badge>
                      </div>
                    </div>
                  )}

                  {selectedNotification.details.dateSubmitted && (
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Date Submitted</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(selectedNotification.details.dateSubmitted).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Notifications;
