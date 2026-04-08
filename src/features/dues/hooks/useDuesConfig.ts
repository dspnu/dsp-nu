import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DuesConfigRow {
  id: string;
  tier_name: string;
  member_status: string;
  amount: number;
  semester: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DuesLateFee {
  id: string;
  semester: string;
  fee_amount: number;
  deadline: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface DuesLineItem {
  id: string;
  user_id: string;
  semester: string;
  type: string; // 'payment' | 'fine' | 'credit' | 'late_fee'
  amount: number;
  description: string | null;
  created_by: string | null;
  created_at: string;
}

export interface DuesInstallment {
  id: string;
  user_id: string;
  semester: string;
  installment_number: number;
  amount: number;
  due_date: string;
  paid: boolean;
  created_at: string;
}

// ---- Config tiers ----
export function useDuesConfig(semester?: string) {
  return useQuery({
    queryKey: ['dues-config', semester],
    queryFn: async () => {
      let q = supabase.from('dues_config').select('*').eq('is_active', true);
      if (semester) q = q.eq('semester', semester);
      const { data, error } = await q.order('amount', { ascending: true });
      if (error) throw error;
      return data as DuesConfigRow[];
    },
  });
}

export function useCreateDuesConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { tier_name: string; member_status: string; amount: number; semester: string }) => {
      const { error } = await supabase.from('dues_config').insert(values);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Tier created'); qc.invalidateQueries({ queryKey: ['dues-config'] }); },
    onError: () => toast.error('Failed to create tier'),
  });
}

export function useUpdateDuesConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<DuesConfigRow> & { id: string }) => {
      const { error } = await supabase.from('dues_config').update(values).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Tier updated'); qc.invalidateQueries({ queryKey: ['dues-config'] }); },
    onError: () => toast.error('Failed to update tier'),
  });
}

export function useDeleteDuesConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('dues_config').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Tier deleted'); qc.invalidateQueries({ queryKey: ['dues-config'] }); },
    onError: () => toast.error('Failed to delete tier'),
  });
}

// ---- Late fees ----
export function useDuesLateFees(semester?: string) {
  return useQuery({
    queryKey: ['dues-late-fees', semester],
    queryFn: async () => {
      let q = supabase.from('dues_late_fees').select('*').eq('is_active', true);
      if (semester) q = q.eq('semester', semester);
      const { data, error } = await q.order('deadline', { ascending: true });
      if (error) throw error;
      return data as DuesLateFee[];
    },
  });
}

export function useCreateLateFee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { semester: string; fee_amount: number; deadline: string; description?: string }) => {
      const { error } = await supabase.from('dues_late_fees').insert(values);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Late fee created'); qc.invalidateQueries({ queryKey: ['dues-late-fees'] }); },
    onError: () => toast.error('Failed to create late fee'),
  });
}

export function useDeleteLateFee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('dues_late_fees').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Late fee removed'); qc.invalidateQueries({ queryKey: ['dues-late-fees'] }); },
    onError: () => toast.error('Failed to delete late fee'),
  });
}

// ---- Line items ----
export function useDuesLineItems(semester?: string) {
  return useQuery({
    queryKey: ['dues-line-items', semester],
    queryFn: async () => {
      let q = supabase.from('dues_line_items').select('*');
      if (semester) q = q.eq('semester', semester);
      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) throw error;
      return data as DuesLineItem[];
    },
  });
}

export function useCreateLineItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { user_id: string; semester: string; type: string; amount: number; description?: string; created_by?: string }) => {
      const { error } = await supabase.from('dues_line_items').insert(values);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Line item recorded'); qc.invalidateQueries({ queryKey: ['dues-line-items'] }); },
    onError: () => toast.error('Failed to record line item'),
  });
}

export function useDeleteLineItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('dues_line_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Line item deleted'); qc.invalidateQueries({ queryKey: ['dues-line-items'] }); },
    onError: () => toast.error('Failed to delete line item'),
  });
}

// ---- Installments ----
export function useDuesInstallments(semester?: string) {
  return useQuery({
    queryKey: ['dues-installments', semester],
    queryFn: async () => {
      let q = supabase.from('dues_installments').select('*');
      if (semester) q = q.eq('semester', semester);
      const { data, error } = await q.order('due_date', { ascending: true });
      if (error) throw error;
      return data as DuesInstallment[];
    },
  });
}

export function useCreateInstallment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { user_id: string; semester: string; installment_number: number; amount: number; due_date: string }) => {
      const { error } = await supabase.from('dues_installments').insert(values);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Installment created'); qc.invalidateQueries({ queryKey: ['dues-installments'] }); },
    onError: () => toast.error('Failed to create installment'),
  });
}

export function useUpdateInstallment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<DuesInstallment> & { id: string }) => {
      const { error } = await supabase.from('dues_installments').update(values).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Installment updated'); qc.invalidateQueries({ queryKey: ['dues-installments'] }); },
    onError: () => toast.error('Failed to update installment'),
  });
}

// ---- Helper: compute member balance ----
export function computeMemberBalance(
  userId: string,
  memberStatus: string,
  configs: DuesConfigRow[],
  lineItems: DuesLineItem[],
  lateFees: DuesLateFee[],
) {
  // Find matching tier
  const tier = configs.find(c => c.member_status === memberStatus) || configs[0];
  const baseAmount = tier?.amount ?? 0;

  // Calculate late fees that apply (deadline passed)
  const now = new Date();
  const applicableLateFees = lateFees.filter(f => new Date(f.deadline) < now).reduce((s, f) => s + Number(f.fee_amount), 0);

  const totalOwed = baseAmount + applicableLateFees;

  // Sum line items for this user
  const userItems = lineItems.filter(li => li.user_id === userId);
  const payments = userItems.filter(li => li.type === 'payment' || li.type === 'credit').reduce((s, li) => s + Number(li.amount), 0);
  const fines = userItems.filter(li => li.type === 'fine' || li.type === 'late_fee').reduce((s, li) => s + Number(li.amount), 0);

  const totalPaid = payments;
  const totalFines = fines;
  const balance = totalOwed + totalFines - totalPaid;
  const status: 'paid' | 'partial' | 'unpaid' = balance <= 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid';

  return { baseAmount, applicableLateFees, totalOwed, totalPaid, totalFines, balance: Math.max(0, balance), status, tierName: tier?.tier_name ?? 'Default' };
}
