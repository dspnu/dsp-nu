import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/core/auth/AuthContext';
import { useEffect } from 'react';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
  event_id: string | null;
  ticketed_event_id?: string | null;
}

interface NotificationPreferences {
  id: string;
  user_id: string;
  push_enabled: boolean;
  service_hours_notifications: boolean;
  coffee_chat_notifications: boolean;
  job_board_notifications: boolean;
  event_notifications: boolean;
  announcement_notifications: boolean;
  event_reminder_24h: boolean;
  data_usage_consent: boolean;
  data_usage_consent_updated_at: string | null;
}

function invalidateNotificationQueries(queryClient: QueryClient, userId: string) {
  queryClient.invalidateQueries({ queryKey: ['notifications'] });
  queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', userId] });
}

export function useNotifications(limit = 100) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['notifications', user?.id, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', user.id] });
    };

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        invalidate
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        invalidate
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        invalidate
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return query;
}

export function useUnreadCount() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['notifications-unread-count', user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('is_read', false);

      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
  });

  return query.data ?? 0;
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      if (user) invalidateNotificationQueries(queryClient, user.id);
    },
  });
}

export function useMarkAsUnread() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: false })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      if (user) invalidateNotificationQueries(queryClient, user.id);
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase.from('notifications').delete().eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      if (user) invalidateNotificationQueries(queryClient, user.id);
    },
  });
}

export function useClearAllNotifications() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('notifications').delete().eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      if (user) invalidateNotificationQueries(queryClient, user.id);
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      if (user) invalidateNotificationQueries(queryClient, user.id);
    },
  });
}

export function useNotificationPreferences() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['notification-preferences', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        const { data: newPrefs, error: insertError } = await supabase
          .from('notification_preferences')
          .insert({ user_id: user.id })
          .select()
          .single();

        if (insertError) throw insertError;
        return newPrefs as NotificationPreferences;
      }

      return data as NotificationPreferences;
    },
    enabled: !!user,
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (updates: Partial<Omit<NotificationPreferences, 'id' | 'user_id'>>) => {
      if (!user) throw new Error('Not authenticated');

      // Update can be a no-op if the row doesn't exist yet (0 rows, no error).
      // Upsert ensures the preference row is created and updated reliably.
      const { data, error } = await supabase
        .from('notification_preferences')
        .upsert(
          {
            user_id: user.id,
            ...updates,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        .select('*')
        .single();

      if (error) throw error;
      return data as NotificationPreferences;
    },
    onSuccess: (updated) => {
      if (user) {
        queryClient.setQueryData(['notification-preferences', user.id], updated);
      }
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
    onError: (err: any) => {
      toast.error(err?.message ?? 'Failed to update preferences');
    },
  });
}

export function useCreateNotification() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (notification: {
      user_id: string;
      title: string;
      message: string;
      type: string;
      link?: string;
      event_id?: string | null;
    }) => {
      const { error } = await supabase.from('notifications').insert(notification);

      if (error) throw error;
    },
    onSuccess: () => {
      if (user) invalidateNotificationQueries(queryClient, user.id);
    },
  });
}
