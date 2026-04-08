import { useMemo } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Coffee } from 'lucide-react';
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
    <div className="space-y-8">
      {pendingConfirmations.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Waiting for Your Confirmation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingConfirmations.map((chat) => (
                <CoffeeChatCard key={chat.id} chat={chat} partnerName={getMemberName(chat.partner_id)} initiatorName={getMemberName(chat.initiator_id)} isOfficer={isAdminOrOfficer} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      <section>
        <Tabs defaultValue="mine" className="space-y-4">
          <TabsList>
            <TabsTrigger value="mine">My Chats</TabsTrigger>
            {isAdminOrOfficer && <TabsTrigger value="all">All Chats</TabsTrigger>}
          </TabsList>
          <TabsContent value="mine">
            {chatsLoading ? (
              <div className="grid gap-4 md:grid-cols-2">{[1, 2, 3].map(i => (<Card key={i} className="h-32 animate-pulse bg-muted" />))}</div>
            ) : myChats && myChats.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {myChats.map((chat) => (
                  <CoffeeChatCard key={chat.id} chat={chat} partnerName={getMemberName(chat.partner_id)} initiatorName={getMemberName(chat.initiator_id)} isOfficer={isAdminOrOfficer} />
                ))}
              </div>
            ) : (
              <EmptyState icon={Coffee} title="No coffee chats yet" description="Coffee chats you've been invited to will appear here." />
            )}
          </TabsContent>
          {isAdminOrOfficer && (
            <TabsContent value="all">
              {allChats && allChats.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {allChats.map((chat) => (
                    <CoffeeChatCard key={chat.id} chat={chat} partnerName={getMemberName(chat.partner_id)} initiatorName={getMemberName(chat.initiator_id)} isOfficer={isAdminOrOfficer} />
                  ))}
                </div>
              ) : (
                <EmptyState icon={Coffee} title="No coffee chats logged" description="Coffee chats from all members will appear here." />
              )}
            </TabsContent>
          )}
        </Tabs>
      </section>
      <CoffeeChatDashboard />
    </div>
  );
}
