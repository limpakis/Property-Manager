import { useState } from 'react';
import { Download, DollarSign, TrendingUp, CreditCard, AlertCircle } from 'lucide-react';
import { Payment, PaymentStats } from '@/types/payment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorMessage } from '@/components/ErrorMessage';
import { StatCard } from '@/components/StatCard';
import { usePayments, usePaymentStats } from '@/hooks/usePropertyQueries';

export default function Payments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');

  const { data: payments = [], isLoading: paymentsLoading, error: paymentsError } = usePayments();
  const { data: stats = null } = usePaymentStats();

  const loading = paymentsLoading;
  const error = paymentsError
    ? (paymentsError instanceof Error ? paymentsError.message : 'Failed to load payment data')
    : null;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      Completed: 'default',
      Pending: 'secondary',
      Failed: 'destructive',
      Refunded: 'outline',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.Payment_ID.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.Tenant_ID.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.Property_ID.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || payment.Status === statusFilter;
    const matchesMethod = methodFilter === 'all' || payment.Payment_Method === methodFilter;

    return matchesSearch && matchesStatus && matchesMethod;
  });

  const exportToCSV = () => {
    if (filteredPayments.length === 0) return;
    
    const headers = Object.keys(payments[0] || {});
    const csv = [
      headers.join(','),
      ...filteredPayments.map(payment => 
        headers.map(header => payment[header as keyof Payment]).join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading payments..." />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight">Payments</h1>
          <p className="text-muted-foreground text-sm mt-1">Track and manage all payment transactions</p>
        </div>
        <Button onClick={exportToCSV} disabled={filteredPayments.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Revenue"
            value={`$${stats.total_revenue.toLocaleString()}`}
            icon={DollarSign}
            variant="default"
          />
          <StatCard
            title="Net Revenue"
            value={`$${stats.net_revenue.toLocaleString()}`}
            icon={TrendingUp}
            variant="success"
          />
          <StatCard
            title="Pending Payments"
            value={stats.pending_payments.toString()}
            icon={AlertCircle}
            variant="warning"
          />
          <StatCard
            title="Card vs ACH"
            value={`${stats.by_method.Card} / ${stats.by_method.ACH}`}
            icon={CreditCard}
            variant="default"
          />
        </div>
      )}

      {/* Filters */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-lg">Filter Payments</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row">
          <Input
            placeholder="Search by ID, Tenant, or Property..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Failed">Failed</SelectItem>
              <SelectItem value="Refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="Card">Card</SelectItem>
              <SelectItem value="ACH">ACH</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-lg">Payment Transactions ({filteredPayments.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Tenant ID</TableHead>
                  <TableHead>Property ID</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Fee</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      No payments found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((payment) => (
                    <TableRow key={payment.Payment_ID}>
                      <TableCell className="font-mono text-sm">{payment.Payment_ID}</TableCell>
                      <TableCell>
                        {new Date(payment.Date_Created).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{payment.Tenant_ID}</TableCell>
                      <TableCell className="font-mono text-sm">{payment.Property_ID}</TableCell>
                      <TableCell className="text-right font-medium">
                        ${parseFloat(payment.Amount || '0').toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        ${parseFloat(payment.Transaction_Fee || '0').toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        ${parseFloat(payment.Net_Amount || '0').toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{payment.Payment_Method}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.Status)}</TableCell>
                      <TableCell className="max-w-xs truncate">{payment.Notes}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
