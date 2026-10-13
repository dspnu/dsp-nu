import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Enums, Tables, TablesUpdate } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { missingAlumniContacts, toAlumniInsert } from '@/core/members/lib/alumniFromMember';

type Profile = Tables<'profiles'>;
type ProfileUpdate = TablesUpdate<'profiles'>;
type MemberStatus = Enums<'member_status'>;

function isMissingRpc(error: { code?: string; message?: string }) {
  return error.code === 'PGRST202' || /apply_member_statuses/i.test(error.message ?? '');
}

async function insertMissingAlumniContacts(members: Profile[]) {
  if (members.length === 0) return;

  const { data: existing, error: readError } = await supabase
    .from('alumni')
    .select('email, first_name, last_name, graduation_year');

  if (readError) throw readError;

  const missing = missingAlumniContacts(members, (existing ?? []) as Tables<'alumni'>[]);
  if (missing.length === 0) return;

  const { error } = await supabase.from('alumni').insert(missing.map(toAlumniInsert));
  if (error) throw error;
}

export function useMembers() {
  return useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'id, user_id, email, first_name, last_name, phone, graduation_year, major, status, positions, committees, pledge_class, avatar_url, linkedin_url, family, big, little'
        )
        .order('last_name', { ascending: true });
      
      if (error) throw error;
      return data as Profile[];
    },
  });
}

export function useMember(id: string) {
  return useQuery({
    queryKey: ['members', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!id,
  });
}

export function useMemberByUserId(userId: string) {
  return useQuery({
    queryKey: ['members', 'user', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!userId,
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ProfileUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle();
      
      if (error) throw error;
      if (!data) throw new Error('Profile not found');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast({ title: 'Profile updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update profile', description: error.message, variant: 'destructive' });
    },
  });
}

export function useBulkSetMemberStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      members,
      status,
    }: {
      members: Profile[];
      status: MemberStatus;
    }) => {
      const ids = members.map((member) => member.id);
      const { error } = await supabase.rpc('apply_member_statuses', {
        p_ids: ids,
        p_status: status,
      });

      if (error && isMissingRpc(error)) {
        const { error: updateError } = await supabase.from('profiles').update({ status }).in('id', ids);
        if (updateError) throw updateError;
        if (status === 'alumni') await insertMissingAlumniContacts(members);
        return;
      }

      if (error) throw error;
    },
    onSuccess: (_data, { members, status }) => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      if (status === 'alumni') {
        queryClient.invalidateQueries({ queryKey: ['alumni'] });
      }
      const label = status.split('_').join(' ');
      toast({
        title: status === 'alumni' ? 'Moved to Alumni' : 'Status updated',
        description:
          status === 'alumni'
            ? `${members.length} ${members.length === 1 ? 'person' : 'people'} now appear on the Alumni tab.`
            : `Updated ${members.length} ${members.length === 1 ? 'person' : 'people'} to ${label}.`,
      });
    },
    onError: (error) => {
      toast({ title: 'Failed to update members', description: error.message, variant: 'destructive' });
    },
  });
}

export function useEnsureAlumniContacts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (members: Profile[]) => {
      const alumniMembers = members.filter((member) => member.status === 'alumni');
      if (alumniMembers.length === 0) return;

      const { error } = await supabase.rpc('apply_member_statuses', {
        p_ids: alumniMembers.map((member) => member.id),
        p_status: 'alumni',
      });

      if (error && isMissingRpc(error)) {
        await insertMissingAlumniContacts(alumniMembers);
        return;
      }

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['alumni'] });
    },
    onError: (error) => {
      toast({
        title: 'Could not add alumni contact',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/** Copies members already marked alumni into the alumni directory once per visit. */
export function useSyncAlumniDirectory(
  members: Profile[] | undefined,
  alumni: Tables<'alumni'>[] | undefined,
  enabled: boolean,
) {
  const ensureAlumniContacts = useEnsureAlumniContacts();
  const started = useRef(false);

  useEffect(() => {
    if (!enabled || !members || !alumni || started.current) return;
    const missing = missingAlumniContacts(
      members.filter((member) => member.status === 'alumni'),
      alumni,
    );
    started.current = true;
    if (missing.length === 0) return;
    ensureAlumniContacts.mutate(missing);
  }, [enabled, members, alumni, ensureAlumniContacts]);
}

export function useMemberPoints(userId: string) {
  return useQuery({
    queryKey: ['member-points', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('points_ledger')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function useMemberAttendance(userId: string) {
  return useQuery({
    queryKey: ['member-attendance', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select('*, events(*)')
        .eq('user_id', userId)
        .order('checked_in_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function useMemberDues(userId: string) {
  return useQuery({
    queryKey: ['member-dues', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dues_payments')
        .select('*')
        .eq('user_id', userId)
        .order('paid_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}
