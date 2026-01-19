import { Link } from 'react-router-dom';
import { Vote, Coffee, ChevronRight, Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMyCoffeeChats } from '@/hooks/useCoffeeChats';

export function AlertsSection() {
  const { data: myCoffeeChats } = useMyCoffeeChats();
  const pendingCoffeeChats = myCoffeeChats?.filter(c => c.status === 'pending') || [];
  
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

  if (!hasActiveVoting && pendingCoffeeChats.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Bell className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wider">Notifications</span>
      </div>
      
      <div className="space-y-2">
        {hasActiveVoting && (
          <Link to="/chapter" className="block">
            <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Vote className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">EOP Voting is Open</p>
                <p className="text-xs text-muted-foreground">Cast your vote for new member candidates</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>
          </Link>
        )}
        
        {pendingCoffeeChats.length > 0 && (
          <Link to="/development" className="block">
            <div className="flex items-center gap-3 p-3 rounded-lg border border-category-brotherhood/20 bg-category-brotherhood/5 hover:bg-category-brotherhood/10 transition-colors">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-category-brotherhood/10 flex items-center justify-center">
                <Coffee className="h-4 w-4 text-category-brotherhood" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {pendingCoffeeChats.length} Pending Coffee Chat{pendingCoffeeChats.length !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-muted-foreground">Waiting for confirmation</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
