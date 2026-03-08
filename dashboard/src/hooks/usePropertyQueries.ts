import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── Query Key Constants ───────────────────────────────────────────────────────
export const QUERY_KEYS = {
  properties: ['properties'] as const,
  property: (id: string) => ['properties', id] as const,
  maintenance: ['maintenance'] as const,
  dashboardStats: ['dashboard-stats'] as const,
  dashboardChart: ['dashboard-chart'] as const,
  payments: ['payments'] as const,
  paymentStats: ['payment-stats'] as const,
  expenses: ['expenses'] as const,
  rentRoll: ['rent-roll'] as const,
  vendors: ['vendors'] as const,
  documents: ['documents'] as const,
  financialSummary: ['financial-summary'] as const,
  taxSummary: (year?: string) => ['tax-summary', year] as const,
  subscription: ['subscription'] as const,
  team: ['team'] as const,
};

// ─── Query Hooks ──────────────────────────────────────────────────────────────

export function useProperties() {
  return useQuery({
    queryKey: QUERY_KEYS.properties,
    queryFn: api.getProperties,
    staleTime: 30_000,
  });
}

export function useProperty(id: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.property(id ?? ''),
    queryFn: () => api.getProperty(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useMaintenance() {
  return useQuery({
    queryKey: QUERY_KEYS.maintenance,
    queryFn: api.getMaintenance,
    staleTime: 30_000,
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: QUERY_KEYS.dashboardStats,
    queryFn: api.getDashboardStats,
    staleTime: 60_000,
  });
}

export function useDashboardChartData() {
  return useQuery({
    queryKey: QUERY_KEYS.dashboardChart,
    queryFn: api.getDashboardChartData,
    staleTime: 60_000,
  });
}

export function usePayments() {
  return useQuery({
    queryKey: QUERY_KEYS.payments,
    queryFn: api.getPayments,
    staleTime: 30_000,
  });
}

export function usePaymentStats() {
  return useQuery({
    queryKey: QUERY_KEYS.paymentStats,
    queryFn: api.getPaymentStats,
    staleTime: 60_000,
  });
}

export function useExpenses() {
  return useQuery({
    queryKey: QUERY_KEYS.expenses,
    queryFn: api.getExpenses,
    staleTime: 30_000,
  });
}

export function useFinancialSummary() {
  return useQuery({
    queryKey: QUERY_KEYS.financialSummary,
    queryFn: api.getFinancialSummary,
    staleTime: 60_000,
  });
}

export function useTaxSummary(year?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.taxSummary(year),
    queryFn: () => api.getTaxSummary(year),
    staleTime: 60_000,
  });
}

export function useVendors() {
  return useQuery({
    queryKey: QUERY_KEYS.vendors,
    queryFn: api.getVendors,
    staleTime: 60_000,
  });
}

export function useDocuments() {
  return useQuery({
    queryKey: QUERY_KEYS.documents,
    queryFn: api.getDocuments,
    staleTime: 30_000,
  });
}

export function useSubscription() {
  return useQuery({
    queryKey: QUERY_KEYS.subscription,
    queryFn: api.getSubscription,
    staleTime: 300_000,
  });
}

export function useTeam() {
  return useQuery({
    queryKey: QUERY_KEYS.team,
    queryFn: api.getTeam,
    staleTime: 60_000,
  });
}

// ─── Mutation Hooks ───────────────────────────────────────────────────────────

export function useCreateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (property: any) => api.createProperty(property),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.properties });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboardStats });
    },
  });
}

export function useUpdateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: any }) =>
      api.updateProperty(id, data),
    onSuccess: (_result, { id }) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.properties });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.property(String(id)) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboardStats });
    },
  });
}

export function useDeleteProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => api.deleteProperty(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.properties });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboardStats });
    },
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (expense: any) => api.createExpense(expense),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.expenses });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.financialSummary });
    },
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.updateExpense(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.expenses });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.financialSummary });
    },
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteExpense(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.expenses });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.financialSummary });
    },
  });
}

export function useInviteTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; full_name: string; role: string }) =>
      api.inviteTeamMember(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.team });
    },
  });
}

export function useRemoveTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.removeTeamMember(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.team });
    },
  });
}
