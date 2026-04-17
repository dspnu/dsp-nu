import { useMemo } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Coffee, LayoutGrid } from 'lucide-react';
import { useAuth } from '@/core/auth/AuthContext';
import { useMembers } from '@/core/members/hooks/useMembers';
import { useMyCoffeeChats, useCoffeeChats } from '@/features/coffee-chats/hooks/useCoffeeChats';
import { CoffeeChatCard } from '@/features/coffee-chats/components/CoffeeChatCard';
import { CoffeeChatDashboard } from '@/features/coffee-chats/components/CoffeeChatDashboard';

export function CoffeeChatsTab() {
  const { user, isAdminOrOfficer } = useAuth();
  const { data: members } = useMembers();
  const { data: myChats, isLoading: chatsLoading } = useMyCoffeeChats();
  const { data: allChats } = useCoffeeChats();

  const getMemberName = (userId: string) => {
    const member = members?.find(m => m.user_id === userId);
    return member ? `${member.first_name} ${member.last_name}` : 'Unknown';
  };

  const pendingConfirmations = useMemo(
    () => myChats?.filter(c => c.status === 'emailed' && c.partner_id === user?.id) || [],
    [myChats, user?.id]
  );

  return (
    <div className="space-y-6">
      {pendingConfirmations.length > 0 && (
        <div className="rounded-lg border border-amber-500/35 bg-amber-500/5 px-4 py-3 dark:border-amber-500/25 dark:bg-amber-500/10">
          <p className="text-sm font-medium text-foreground flex items-center gap-2 mb-3">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500" />
            Confirm these coffee chats
          </p>
          <div className="space-y-3">
            {pendingConfirmations.map((chat) => (
              <CoffeeChatCard key={chat.id} chat={chat} partnerName={getMemberName(chat.partner_id)} initiatorName={getMemberName(chat.initiator_id)} isOfficer={isAdminOrOfficer} />
            ))}
          </div>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your chats</h2>
        <Tabs defaultValue="mine" className="space-y-4">
          <TabsList className="grid h-9 w-full grid-cols-2 sm:inline-flex sm:w-auto">
            <TabsTrigger value="mine" className="gap-1.5">
              <Coffee className="h-3.5 w-3.5 opacity-80" />
              My chats
            </TabsTrigger>
            {isAdminOrOfficer && (
              <TabsTrigger value="all" className="gap-1.5">
                <LayoutGrid className="h-3.5 w-3.5 hidden sm:inline" />
                All chats
              </TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="mine" className="mt-0">
            {chatsLoading ? (
              <div className="grid gap-3 sm:grid-cols-2">{[1, 2, 3].map(i => (<Card key={i} className="h-28 animate-pulse bg-muted/80" />))}</div>
            ) : myChats && myChats.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {myChats.map((chat) => (
                  <CoffeeChatCard key={chat.id} chat={chat} partnerName={getMemberName(chat.partner_id)} initiatorName={getMemberName(chat.initiator_id)} isOfficer={isAdminOrOfficer} />
                ))}
              </div>
            ) : (
              <EmptyState icon={Coffee} title="No coffee chats yet" description="Chats you start or get invited to will show up here." />
            )}
          </TabsContent>
          {isAdminOrOfficer && (
            <TabsContent value="all" className="mt-0">
              {allChats && allChats.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {allChats.map((chat) => (
                    <CoffeeChatCard key={chat.id} chat={chat} partnerName={getMemberName(chat.partner_id)} initiatorName={getMemberName(chat.initiator_id)} isOfficer={isAdminOrOfficer} />
                  ))}
                </div>
              ) : (
                <EmptyState icon={Coffee} title="No coffee chats yet" description="Member coffee chats will appear here." />
              )}
            </TabsContent>
          )}
        </Tabs>
      </section>

      <section className="border-t border-border pt-6 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Chapter activity</h2>
        <CoffeeChatDashboard collapsibleEngagement />
      </section>
    </div>
  );
}
