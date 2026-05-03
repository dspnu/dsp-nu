import { useEffect, useRef } from 'react';
import { differenceInCalendarDays, startOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/core/auth/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { isCapabilityEnabled } from '@/config/capabilities';
import { computeMemberBalance } from '@/features/dues/hooks/useDuesConfig';

const currentSemester = () => {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  return month >= 7 ? `Fall ${year}` : `Spring ${year}`;
};

async function hasNotificationWithLink(userId: string, link: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .eq('link', link)
    .limit(1);
  if (error) return true;
  return (data?.length ?? 0) > 0;
}

/**
 * Creates in-app notifications for installment due dates and late-fee windows when the app loads.
 * Dedupes by stable `link` values so each milestone is sent once per user.
 */
export function useDuesReminderSync() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const ran = useRef<string | null>(null);

  useEffect(() => {
    ran.current = null;
  }, [user?.id]);

  useEffect(() => {
    if (!isCapabilityEnabled('dues')) return;
    if (!user?.id || !profile?.status) return;

    const key = `${user.id}:${profile.status}`;
    if (ran.current === key) return;
    ran.current = key;

    void (async () => {
      const semester = currentSemester();
      const today = startOfDay(new Date());

      const [cfgRes, lateRes, lineRes, instRes] = await Promise.all([
        supabase.from('dues_config').select('*').eq('is_active', true).eq('semester', semester),
        supabase.from('dues_late_fees').select('*').eq('is_active', true).eq('semester', semester),
        supabase.from('dues_line_items').select('*').eq('semester', semester),
        supabase.from('dues_installments').select('*').eq('semester', semester).eq('user_id', user.id),
      ]);

      const configs = cfgRes.data ?? [];
      const lateFees = lateRes.data ?? [];
      const lineItems = lineRes.data ?? [];
      const installments = instRes.data ?? [];

      const rows: {
        user_id: string;
        title: string;
        message: string;
        type: string;
        link: string;
      }[] = [];

      const unpaid = installments.filter((i: { paid: boolean }) => !i.paid);

      for (const inst of unpaid) {
        const due = startOfDay(new Date(inst.due_date));
        const daysUntil = differenceInCalendarDays(due, today);

        if (daysUntil < 0) {
          const link = `/chapter?duesRef=installment-${inst.id}-overdue`;
          if (!(await hasNotificationWithLink(user.id, link))) {
            rows.push({
              user_id: user.id,
              title: 'Overdue installment',
              message: `Installment #${inst.installment_number} was due ${due.toLocaleDateString()}. Please submit payment or contact the VP of Finance.`,
              type: 'dues_overdue',
              link,
            });
          }
          continue;
        }

        if (daysUntil === 0) {
          const link = `/chapter?duesRef=installment-${inst.id}-today`;
          if (!(await hasNotificationWithLink(user.id, link))) {
            rows.push({
              user_id: user.id,
              title: 'Installment due today',
              message: `Installment #${inst.installment_number} is due today ($${Number(inst.amount).toFixed(2)}).`,
              type: 'dues_reminder',
              link,
            });
          }
          continue;
        }

        if (daysUntil >= 1 && daysUntil <= 7) {
          const link = `/chapter?duesRef=installment-${inst.id}-soon`;
          if (!(await hasNotificationWithLink(user.id, link))) {
            rows.push({
              user_id: user.id,
              title: daysUntil === 1 ? 'Installment due tomorrow' : 'Upcoming installment',
              message: `Installment #${inst.installment_number} is due in ${daysUntil} day${daysUntil === 1 ? '' : 's'} ($${Number(inst.amount).toFixed(2)}).`,
              type: 'dues_reminder',
              link,
            });
          }
        }
      }

      const bal = computeMemberBalance(user.id, profile.status, configs, lineItems, lateFees);
      if (bal.balance > 0) {
        for (const fee of lateFees) {
          const deadline = startOfDay(new Date(fee.deadline));
          const daysUntil = differenceInCalendarDays(deadline, today);
          if (daysUntil >= 0 && daysUntil <= 7) {
            const link = `/chapter?duesRef=latefee-${fee.id}-soon`;
            if (!(await hasNotificationWithLink(user.id, link))) {
              rows.push({
                user_id: user.id,
                title: 'Late fee deadline approaching',
                message:
                  daysUntil === 0
                    ? `A late fee of $${Number(fee.fee_amount).toFixed(2)} applies after today unless your balance is cleared. Current balance: $${bal.balance.toFixed(2)}.`
                    : `A late fee of $${Number(fee.fee_amount).toFixed(2)} may apply in ${daysUntil} day${daysUntil === 1 ? '' : 's'}. Balance due: $${bal.balance.toFixed(2)}.`,
                type: 'dues_reminder',
                link,
              });
            }
          }
        }
      }

      if (!rows.length) return;

      const { error } = await supabase.from('notifications').insert(rows);
      if (!error) {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', user.id] });
      }
    })();
  }, [user?.id, profile?.status, queryClient]);
}
