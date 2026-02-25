import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Coffee, AlertCircle } from 'lucide-react';
import { useMyCoffeeChats, useCoffeeChats } from '@/hooks/useCoffeeChats';
import { useMembers } from '@/hooks/useMembers';
import { useAuth } from '@/contexts/AuthContext';
import { CoffeeChatForm } from '@/components/coffee-chats/CoffeeChatForm';
import { CoffeeChatCard } from '@/components/coffee-chats/CoffeeChatCard';
import { CoffeeChatDashboard } from '@/components/coffee-chats/CoffeeChatDashboard';

interface Props {
  isVP: boolean;
  isNewMember: boolean;
}

export function PDPCoffeeChats({ isVP, isNewMember }: Props) {
  const { user, isAdminOrOfficer } = useAuth();
  const { data: myChats, isLoading } = useMyCoffeeChats();
  const { data: allChats } = useCoffeeChats();
  const { data: members } = useMembers();

  const completedCount = myChats?.filter(c => c.status === 'completed').length || 0;
  const scheduledCount = myChats?.filter(c => c.status === 'scheduled').length || 0;
  const emailedCount = myChats?.filter(c => c.status === 'emailed').length || 0;
  const totalRequired = 50;

  const getMemberName = (userId: string) => {
    const member = members?.find(m => m.user_id === userId);
    return member ? `${member.first_name} ${member.last_name}` : 'Unknown';
  };

  const pendingConfirmations = myChats?.filter(
    c => c.status === 'emailed' && c.partner_id === user?.id
  ) || [];

  return (
    <div className="space-y-8">
      {/* Personal progress + log form for new members */}
      {isNewMember && (
        <>
          <div className="flex items-center justify-between">
            <div />
            <CoffeeChatForm />
          </div>

          <Card className="border-primary/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Your Progress</h3>
                  <p className="text-sm text-muted-foreground">
                    {completedCount} of {totalRequired} completed
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    {Math.round((completedCount / totalRequired) * 100)}%
                  </div>
                  <p className="text-xs text-muted-foreground">{emailedCount} emailed · {scheduledCount} scheduled</p>
                </div>
              </div>
              <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.min((completedCount / totalRequired) * 100, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Pending Confirmations */}
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
                <CoffeeChatCard
                  key={chat.id}
                  chat={chat}
                  partnerName={getMemberName(chat.partner_id)}
                  initiatorName={getMemberName(chat.initiator_id)}
                  isOfficer={isAdminOrOfficer}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Chats / All Chats */}
      <section>
        <Tabs defaultValue="mine" className="space-y-4">
          <TabsList>
            <TabsTrigger value="mine">My Chats</TabsTrigger>
            {(isVP || isAdminOrOfficer) && <TabsTrigger value="all">All Chats</TabsTrigger>}
          </TabsList>

          <TabsContent value="mine">
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="h-32 animate-pulse bg-muted" />
                ))}
              </div>
            ) : myChats && myChats.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {myChats.map((chat) => (
                  <CoffeeChatCard
                    key={chat.id}
                    chat={chat}
                    partnerName={getMemberName(chat.partner_id)}
                    initiatorName={getMemberName(chat.initiator_id)}
                    isOfficer={isAdminOrOfficer}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Coffee}
                title="No coffee chats yet"
                description={isNewMember
                  ? "Log your first coffee chat with a chapter member!"
                  : "Coffee chat tracking is available for New Members."
                }
              />
            )}
          </TabsContent>

          {(isVP || isAdminOrOfficer) && (
            <TabsContent value="all">
              {allChats && allChats.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {allChats.map((chat) => (
                    <CoffeeChatCard
                      key={chat.id}
                      chat={chat}
                      partnerName={getMemberName(chat.partner_id)}
                      initiatorName={getMemberName(chat.initiator_id)}
                      isOfficer={isAdminOrOfficer}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Coffee}
                  title="No coffee chats logged"
                  description="Coffee chats from all members will appear here."
                />
              )}
            </TabsContent>
          )}
        </Tabs>
      </section>

      {/* Full dashboard with progress, milestones, engagement */}
      <CoffeeChatDashboard />
    </div>
  );
}
