import { Link } from 'react-router-dom';
import { Vote, Coffee, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMyCoffeeChats } from '@/features/coffee-chats/hooks/useCoffeeChats';

export function AlertsSection() {
  const { data: myCoffeeChats } = useMyCoffeeChats();
  const pendingCoffeeChats = myCoffeeChats?.filter(c => c.status === 'emailed') || [];
  
  const { data: eopCandidates } = useQuery({
    queryKey: ['eop-voting-open'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('eop_candidates')
        .select('id')
        .eq('voting_open', true);
      if (error) throw error;
      return data;
    },
  });
  const hasActiveVoting = (eopCandidates?.length || 0) > 0;

  if (!hasActiveVoting && pendingCoffeeChats.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {hasActiveVoting && (
        <Link to="/eop" className="block">
          <div className="flex items-center gap-3 p-3 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/8 active:scale-[0.98] transition-all">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Vote className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">EOP Voting is Open</p>
              <p className="text-xs text-muted-foreground">Cast your vote for candidates</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
        </Link>
      )}
      
      {pendingCoffeeChats.length > 0 && (
        <Link to="/chapter" className="block">
          <div className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-card hover:bg-muted/40 active:scale-[0.98] transition-all">
            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Coffee className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                {pendingCoffeeChats.length} Pending Coffee Chat{pendingCoffeeChats.length !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-muted-foreground">Waiting for confirmation</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
        </Link>
      )}
    </div>
  );
}
