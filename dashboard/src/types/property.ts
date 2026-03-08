export type PropertyType = 'apartment' | 'house' | 'commercial' | 'condo';

export interface Property {
  id: string;
  name: string;
  address: string;
  type: PropertyType;
  units: number;
  occupiedUnits: number;
  monthlyRent: number;
  notes?: string;
  image?: string;
}

export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  propertyId: string;
  propertyName: string;
  unit: string;
  rentAmount: number;
  leaseStart: string;
  leaseEnd: string;
  paymentStatus: 'paid' | 'pending' | 'overdue';
}

export interface Payment {
  id: string;
  tenantId: string;
  tenantName: string;
  propertyName: string;
  amount: number;
  date: string;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue';
  method?: string;
}

export interface Expense {
  id: string;
  propertyId: string;
  propertyName: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  recurring: boolean;
  status: 'paid' | 'unpaid';
}

export interface Notification {
  id: string;
  type: 'rent_due' | 'overdue' | 'lease_expiring' | 'bill_due';
  message: string;
  date: string;
  read: boolean;
}
