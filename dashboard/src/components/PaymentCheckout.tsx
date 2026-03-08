import { useState } from 'react';
import { CreditCard, DollarSign, ChevronDown } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

interface PaymentCheckoutProps {
  tenantId?: string;
  propertyId?: string;
  prefilledAmount?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function PaymentCheckout({ 
  tenantId: initialTenantId = '', 
  propertyId: initialPropertyId = '', 
  prefilledAmount = 0,
  onSuccess,
  onCancel 
}: PaymentCheckoutProps) {
  const [tenantId, setTenantId] = useState(initialTenantId);
  const [propertyId, setPropertyId] = useState(initialPropertyId);
  const [amount, setAmount] = useState(prefilledAmount.toString());
  const [type, setType] = useState<'rent' | 'deposit' | 'late_fee'>('rent');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate fees
  const numAmount = parseFloat(amount) || 0;
  const cardFee = numAmount * 0.029 + 0.30;
  const achFee = numAmount * 0.008;
  const cardTotal = numAmount + cardFee;
  const achTotal = numAmount + achFee;

  const handleCreateCheckout = async () => {
    if (!tenantId || !propertyId || numAmount <= 0) {
      setError('Please fill in all required fields with valid values');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await api.createCheckoutSession({
        tenantId,
        propertyId,
        amount: numAmount,
        type,
        description,
      });

      // Redirect to Stripe checkout
      if (response.url) {
        window.location.href = response.url;
      } else {
        setError('Failed to create checkout session');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create checkout session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Checkout
        </CardTitle>
        <CardDescription>
          Create a secure payment checkout session for rent, deposits, or fees
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="tenantId">Tenant ID *</Label>
            <Input
              id="tenantId"
              placeholder="e.g., TEN12345"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="propertyId">Property ID *</Label>
            <Input
              id="propertyId"
              placeholder="e.g., PROP12345"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-9"
                step="0.01"
                min="0"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Payment Type *</Label>
            <Select value={type} onValueChange={(value: any) => setType(value)} disabled={loading}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rent">Rent</SelectItem>
                <SelectItem value="deposit">Deposit</SelectItem>
                <SelectItem value="late_fee">Late Fee</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <Input
            id="description"
            placeholder="e.g., January 2026 rent payment"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
          />
        </div>

        <Separator />

        <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
          <h3 className="font-semibold text-sm">Fee Breakdown</h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Base Amount</span>
              <span className="font-medium">${numAmount.toFixed(2)}</span>
            </div>

            <Separator />

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">💳 Card Fee (2.9% + $0.30)</span>
                <span>${cardFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Card Total</span>
                <span>${cardTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">🏦 ACH Fee (0.8%)</span>
                <span>${achFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-medium text-green-600">
                <span>ACH Total (Recommended)</span>
                <span>${achTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            * The customer will choose their payment method during checkout
          </p>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={loading} className="flex-1">
            Cancel
          </Button>
        )}
        <Button 
          onClick={handleCreateCheckout} 
          disabled={loading || !tenantId || !propertyId || numAmount <= 0}
          className="flex-1"
        >
          {loading ? 'Creating...' : 'Create Checkout Session'}
        </Button>
      </CardFooter>
    </Card>
  );
}
