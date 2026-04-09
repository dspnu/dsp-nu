import { useMemo } from 'react';
import { useAuth } from '@/core/auth/AuthContext';
import {
  useDuesConfig,
  useDuesLateFees,
  useDuesLineItems,
  useDuesInstallments,
  computeMemberBalance,
} from '@/features/dues/hooks/useDuesConfig';

const currentSemester = () => {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  return month >= 7 ? `Fall ${year}` : `Spring ${year}`;
};

export interface OverdueInstallment {
  id: string;
  amount: number;
  dueDate: string;
  installmentNumber: number;
}

/**
 * Current member's dues balance, installment schedule, and overdue items for the active semester.
 */
export function useDuesPersonalSchedule(semester: string = currentSemester()) {
  const { user, profile } = useAuth();

  const { data: configs = [] } = useDuesConfig(semester);
  const { data: lateFees = [] } = useDuesLateFees(semester);
  const { data: lineItems = [] } = useDuesLineItems(semester);
  const { data: installments = [] } = useDuesInstallments(semester);

  const mine = useMemo(
    () => installments.filter((i) => i.user_id === user?.id),
    [installments, user?.id]
  );

  const balanceInfo = useMemo(() => {
    if (!user?.id || !profile?.status) {
      return null;
    }
    return computeMemberBalance(user.id, profile.status, configs, lineItems, lateFees);
  }, [user?.id, profile?.status, configs, lineItems, lateFees]);

  const overdueInstallments = useMemo((): OverdueInstallment[] => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return mine
      .filter((i) => !i.paid && new Date(i.due_date) < startOfToday)
      .map((i) => ({
        id: i.id,
        amount: Number(i.amount),
        dueDate: i.due_date,
        installmentNumber: i.installment_number,
      }));
  }, [mine]);

  const upcomingInstallments = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return mine
      .filter((i) => !i.paid && new Date(i.due_date) >= startOfToday)
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  }, [mine]);

  return {
    semester,
    balanceInfo,
    overdueInstallments,
    upcomingInstallments,
    hasOverdue: overdueInstallments.length > 0,
    isLoading: false,
  };
}
