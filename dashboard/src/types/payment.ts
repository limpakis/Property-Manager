export interface Payment {
  Payment_ID: string;
  Tenant_ID: string;
  Property_ID: string;
  Amount: string;
  Transaction_Fee: string;
  Net_Amount: string;
  Payment_Method: 'ACH' | 'Card' | 'Pending';
  Status: 'Pending' | 'Completed' | 'Failed' | 'Refunded';
  Stripe_Payment_Intent_ID: string;
  Date_Created: string;
  Date_Completed?: string;
  Notes?: string;
}

export interface PaymentStats {
  total_revenue: number;
  total_fees: number;
  net_revenue: number;
  total_payments: number;
  completed_payments: number;
  pending_payments: number;
  failed_payments: number;
  by_method: {
    Card: number;
    ACH: number;
  };
}

export interface CreatePaymentRequest {
  tenantId: string;
  propertyId: string;
  amount: number;
  type: 'rent' | 'deposit' | 'late_fee';
  description?: string;
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
  paymentId: string;
}

export interface PaymentLink {
  url: string;
  id: string;
}
