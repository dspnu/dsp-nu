import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type DuesPayment = {
  id: string;
  user_id: string;
  amount: number | string;
  semester: string;
  paid_at: string;
};

export interface PresidentRecentDuesCardProps {
  payments: DuesPayment[];
  members: Tables<'profiles'>[];
}

export function PresidentRecentDuesCard({ payments, members }: PresidentRecentDuesCardProps) {
  if (payments.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Recent Dues Payments
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Semester</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.slice(0, 10).map((payment) => {
              const m = members.find((row) => row.user_id === payment.user_id);
              return (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">
                    {m ? `${m.first_name} ${m.last_name}` : 'Unknown'}
                  </TableCell>
                  <TableCell>${Number(payment.amount).toFixed(2)}</TableCell>
                  <TableCell>{payment.semester}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(payment.paid_at), 'MMM d, yyyy')}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
