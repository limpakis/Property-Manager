import { useEffect, useState } from 'react';
import { CreditCard, History, Link as LinkIcon, Loader2, Calendar, DollarSign } from 'lucide-react';
import api from '@/lib/api';
import { Payment } from '@/types/payment';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';

interface TenantPaymentPortalProps {
  tenantId: string;
  propertyId: string;
  rentAmount: number;
  dueDate?: string;
  lateFeeAmount?: number;
}

export default function TenantPaymentPortal({
  tenantId,
  propertyId,
  rentAmount,
  dueDate,
  lateFeeAmount = 0,
}: TenantPaymentPortalProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPayments();
  }, [tenantId]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getPaymentsByTenant(tenantId);
      // Sort by date, most recent first
      setPayments(data.sort((a: Payment, b: Payment) => 
        new Date(b.Date_Created).getTime() - new Date(a.Date_Created).getTime()
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const handleMakePayment = async () => {
    try {
      setCreating(true);
      setError(null);

      const response = await api.createCheckoutSession({
        tenantId,
        propertyId,
        amount: rentAmount + lateFeeAmount,
        type: 'rent',
        description: `Rent payment${lateFeeAmount > 0 ? ' with late fee' : ''}`,
      });

      if (response.url) {
        window.location.href = response.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create payment session');
      setCreating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      Completed: 'default',
      Pending: 'secondary',
      Failed: 'destructive',
      Refunded: 'outline',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const isPastDue = dueDate && new Date(dueDate) < new Date();
  const totalDue = rentAmount + lateFeeAmount;

  return (
    <div className="space-y-6">
      {/* Payment Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Current Rent Due
          </CardTitle>
          <CardDescription>Make a secure payment for your rent</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPastDue && (
            <Alert variant="destructive">
              <AlertTitle>Payment Overdue</AlertTitle>
              <AlertDescription>
                Your rent payment is past due. Please make a payment as soon as possible.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Monthly Rent</span>
              <span className="font-medium">${rentAmount.toFixed(2)}</span>
            </div>

            {lateFeeAmount > 0 && (
              <div className="flex justify-between text-sm text-destructive">
                <span>Late Fee</span>
                <span className="font-medium">${lateFeeAmount.toFixed(2)}</span>
              </div>
            )}

            <Separator />

            <div className="flex justify-between text-lg font-semibold">
              <span>Total Due</span>
              <span>${totalDue.toFixed(2)}</span>
            </div>

            {dueDate && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Due Date: {new Date(dueDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          <Button 
            onClick={handleMakePayment} 
            disabled={creating || totalDue <= 0} 
            className="w-full"
            size="lg"
          >
            {creating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Payment...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Pay ${totalDue.toFixed(2)} Now
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Secure payment powered by Stripe • Card or ACH accepted
          </p>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Payment History
          </CardTitle>
          <CardDescription>Your recent payment transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No payment history yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.Payment_ID}>
                      <TableCell>
                        {new Date(payment.Date_Created).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${parseFloat(payment.Amount || '0').toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{payment.Payment_Method}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.Status)}</TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                        {payment.Notes}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
