import { Property, Tenant, Payment, Expense, Notification } from '@/types/property';

export const properties: Property[] = [
  { id: '1', name: 'Sunset Apartments', address: '123 Sunset Blvd, Los Angeles, CA', type: 'apartment', units: 8, occupiedUnits: 7, monthlyRent: 12600, notes: 'Recently renovated' },
  { id: '2', name: 'Oak Street House', address: '456 Oak St, Portland, OR', type: 'house', units: 1, occupiedUnits: 1, monthlyRent: 2200 },
  { id: '3', name: 'Downtown Office', address: '789 Main Ave, Seattle, WA', type: 'commercial', units: 4, occupiedUnits: 3, monthlyRent: 8400 },
  { id: '4', name: 'Maple Grove Condos', address: '321 Maple Dr, Austin, TX', type: 'condo', units: 6, occupiedUnits: 5, monthlyRent: 9000 },
  { id: '5', name: 'River View Apartments', address: '555 River Rd, Denver, CO', type: 'apartment', units: 12, occupiedUnits: 10, monthlyRent: 18000 },
];

export const tenants: Tenant[] = [
  { id: '1', name: 'Sarah Johnson', email: 'sarah@email.com', phone: '(555) 123-4567', propertyId: '1', propertyName: 'Sunset Apartments', unit: 'Unit 3A', rentAmount: 1800, leaseStart: '2024-01-15', leaseEnd: '2025-01-14', paymentStatus: 'paid' },
  { id: '2', name: 'Michael Chen', email: 'michael@email.com', phone: '(555) 234-5678', propertyId: '1', propertyName: 'Sunset Apartments', unit: 'Unit 5B', rentAmount: 1800, leaseStart: '2024-03-01', leaseEnd: '2025-02-28', paymentStatus: 'pending' },
  { id: '3', name: 'Emily Davis', email: 'emily@email.com', phone: '(555) 345-6789', propertyId: '2', propertyName: 'Oak Street House', unit: 'Main', rentAmount: 2200, leaseStart: '2024-06-01', leaseEnd: '2025-05-31', paymentStatus: 'paid' },
  { id: '4', name: 'James Wilson', email: 'james@email.com', phone: '(555) 456-7890', propertyId: '3', propertyName: 'Downtown Office', unit: 'Suite 201', rentAmount: 2800, leaseStart: '2024-02-01', leaseEnd: '2026-01-31', paymentStatus: 'overdue' },
  { id: '5', name: 'Lisa Anderson', email: 'lisa@email.com', phone: '(555) 567-8901', propertyId: '4', propertyName: 'Maple Grove Condos', unit: 'Unit 12', rentAmount: 1800, leaseStart: '2024-04-01', leaseEnd: '2025-03-31', paymentStatus: 'paid' },
  { id: '6', name: 'Robert Martinez', email: 'robert@email.com', phone: '(555) 678-9012', propertyId: '5', propertyName: 'River View Apartments', unit: 'Unit 7C', rentAmount: 1800, leaseStart: '2024-05-01', leaseEnd: '2025-04-30', paymentStatus: 'pending' },
];

export const payments: Payment[] = [
  { id: '1', tenantId: '1', tenantName: 'Sarah Johnson', propertyName: 'Sunset Apartments', amount: 1800, date: '2025-02-01', dueDate: '2025-02-01', status: 'paid', method: 'Bank Transfer' },
  { id: '2', tenantId: '2', tenantName: 'Michael Chen', propertyName: 'Sunset Apartments', amount: 1800, date: '', dueDate: '2025-02-01', status: 'pending' },
  { id: '3', tenantId: '3', tenantName: 'Emily Davis', propertyName: 'Oak Street House', amount: 2200, date: '2025-02-02', dueDate: '2025-02-01', status: 'paid', method: 'Check' },
  { id: '4', tenantId: '4', tenantName: 'James Wilson', propertyName: 'Downtown Office', amount: 2800, date: '', dueDate: '2025-01-15', status: 'overdue' },
  { id: '5', tenantId: '5', tenantName: 'Lisa Anderson', propertyName: 'Maple Grove Condos', amount: 1800, date: '2025-02-01', dueDate: '2025-02-01', status: 'paid', method: 'Online' },
  { id: '6', tenantId: '6', tenantName: 'Robert Martinez', propertyName: 'River View Apartments', amount: 1800, date: '', dueDate: '2025-02-05', status: 'pending' },
  { id: '7', tenantId: '1', tenantName: 'Sarah Johnson', propertyName: 'Sunset Apartments', amount: 1800, date: '2025-01-01', dueDate: '2025-01-01', status: 'paid', method: 'Bank Transfer' },
  { id: '8', tenantId: '3', tenantName: 'Emily Davis', propertyName: 'Oak Street House', amount: 2200, date: '2025-01-03', dueDate: '2025-01-01', status: 'paid', method: 'Check' },
];

export const expenses: Expense[] = [
  { id: '1', propertyId: '1', propertyName: 'Sunset Apartments', category: 'Maintenance', description: 'Plumbing repair - Unit 2A', amount: 450, date: '2025-02-05', recurring: false, status: 'paid' },
  { id: '2', propertyId: '1', propertyName: 'Sunset Apartments', category: 'Utilities', description: 'Water bill - February', amount: 380, date: '2025-02-10', recurring: true, status: 'unpaid' },
  { id: '3', propertyId: '2', propertyName: 'Oak Street House', category: 'Insurance', description: 'Property insurance - Q1', amount: 1200, date: '2025-01-15', recurring: true, status: 'paid' },
  { id: '4', propertyId: '3', propertyName: 'Downtown Office', category: 'Taxes', description: 'Property tax payment', amount: 3200, date: '2025-01-20', recurring: false, status: 'paid' },
  { id: '5', propertyId: '4', propertyName: 'Maple Grove Condos', category: 'Maintenance', description: 'Landscaping service', amount: 600, date: '2025-02-01', recurring: true, status: 'paid' },
  { id: '6', propertyId: '5', propertyName: 'River View Apartments', category: 'Utilities', description: 'Electricity - Common areas', amount: 520, date: '2025-02-08', recurring: true, status: 'unpaid' },
  { id: '7', propertyId: '3', propertyName: 'Downtown Office', category: 'Maintenance', description: 'HVAC maintenance', amount: 850, date: '2025-02-12', recurring: false, status: 'unpaid' },
];

export const notifications: Notification[] = [
  { id: '1', type: 'overdue', message: 'James Wilson rent is 32 days overdue ($2,800)', date: '2025-02-16', read: false },
  { id: '2', type: 'rent_due', message: 'Michael Chen rent due today ($1,800)', date: '2025-02-16', read: false },
  { id: '3', type: 'lease_expiring', message: 'Sarah Johnson lease expires in 30 days', date: '2025-02-16', read: false },
  { id: '4', type: 'bill_due', message: 'Water bill for Sunset Apartments due Feb 20', date: '2025-02-16', read: true },
  { id: '5', type: 'rent_due', message: 'Robert Martinez rent due in 5 days ($1,800)', date: '2025-02-16', read: true },
];

export const monthlyData = [
  { month: 'Sep', income: 42000, expenses: 8200 },
  { month: 'Oct', income: 44500, expenses: 7800 },
  { month: 'Nov', income: 43200, expenses: 9100 },
  { month: 'Dec', income: 45000, expenses: 11500 },
  { month: 'Jan', income: 46200, expenses: 8900 },
  { month: 'Feb', income: 50200, expenses: 7200 },
];
