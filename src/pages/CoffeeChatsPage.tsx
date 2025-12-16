import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Coffee, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { CoffeeChatForm } from '@/components/coffee-chats/CoffeeChatForm';
import { CoffeeChatCard } from '@/components/coffee-chats/CoffeeChatCard';
import { useMyCoffeeChats, useCoffeeChats } from '@/hooks/useCoffeeChats';
import { useMembers } from '@/hooks/useMembers';
import { useAuth } from '@/contexts/AuthContext';

export default function CoffeeChatsPage() {
  const { user, profile, isAdminOrOfficer } = useAuth();
  const { data: myChats, isLoading: myChatsLoading } = useMyCoffeeChats();
  const { data: allChats, isLoading: allChatsLoading } = useCoffeeChats();
  const { data: members } = useMembers();

  // Check if user is eligible (New Mem or Shiny)
  const isEligible = profile?.status === 'new_mem' || profile?.status === 'shiny';

  // Get member names helper
  const getMemberName = (userId: string) => {
    const member = members?.find(m => m.user_id === userId);
    return member ? `${member.first_name} ${member.last_name}` : 'Unknown';
  };

  // Calculate stats
  const confirmedCount = myChats?.filter(c => c.status === 'confirmed').length || 0;
  const pendingCount = myChats?.filter(c => c.status === 'pending').length || 0;
  const totalRequired = 10; // Configurable requirement

  const pendingConfirmations = myChats?.filter(
    c => c.status === 'pending' && c.partner_id === user?.id
  ) || [];

  return (
    <AppLayout>
      <PageHeader 
        title="Coffee Chats" 
        description="Track your sig meetings with chapter members"
      >
        {isEligible && <CoffeeChatForm />}
      </PageHeader>

      {/* Progress Card */}
      {isEligible && (
        <Card className="mb-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Your Progress</h3>
                <p className="text-muted-foreground">
                  {confirmedCount} of {totalRequired} confirmed
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-primary">
                  {Math.round((confirmedCount / totalRequired) * 100)}%
                </div>
                <p className="text-sm text-muted-foreground">{pendingCount} pending</p>
              </div>
            </div>
            <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all"
                style={{ width: `${Math.min((confirmedCount / totalRequired) * 100, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Confirmations */}
      {pendingConfirmations.length > 0 && (
        <Card className="mb-6 border-amber-200 dark:border-amber-800">
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

      <Tabs defaultValue="mine" className="space-y-4">
        <TabsList>
          <TabsTrigger value="mine">My Chats</TabsTrigger>
          {isAdminOrOfficer && <TabsTrigger value="all">All Chats</TabsTrigger>}
        </TabsList>

        <TabsContent value="mine">
          {myChatsLoading ? (
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
              description={isEligible 
                ? "Log your first coffee chat with a chapter member!"
                : "Coffee chat tracking is available for New Members and Shiny members."
              }
            />
          )}
        </TabsContent>

        {isAdminOrOfficer && (
          <TabsContent value="all">
            {allChatsLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="h-32 animate-pulse bg-muted" />
                ))}
              </div>
            ) : allChats && allChats.length > 0 ? (
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
    </AppLayout>
  );
}
