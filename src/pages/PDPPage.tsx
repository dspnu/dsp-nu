import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Coffee, ClipboardList, FolderOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { PDPCoffeeChats } from '@/components/pdp/PDPCoffeeChats';
import { PDPAssignments } from '@/components/pdp/PDPAssignments';
import { PDPResources } from '@/components/pdp/PDPResources';

export default function PDPPage() {
  const { profile, isAdminOrOfficer } = useAuth();
  const [activeTab, setActiveTab] = useState('coffee-chats');

  const isNewMember = profile?.status === 'new_member';
  const isVP = profile?.positions?.includes('VP of New Member Development') ||
    profile?.positions?.includes('VP of Pledge Education') ||
    profile?.positions?.includes('VP of New Member Education');

  const hasAccess = isNewMember || isVP || false;

  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }

  return (
    <AppLayout>
      <PageHeader
        title="PDP"
        description="Professional Development Program — your hub for the new member process"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="coffee-chats" className="gap-2">
            <Coffee className="h-4 w-4" />
            Coffee Chats
          </TabsTrigger>
          <TabsTrigger value="assignments" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Assignments
          </TabsTrigger>
          <TabsTrigger value="resources" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            Resources
          </TabsTrigger>
        </TabsList>

        <TabsContent value="coffee-chats">
          <PDPCoffeeChats isVP={!!isVP} isNewMember={isNewMember} />
        </TabsContent>

        <TabsContent value="assignments">
          <PDPAssignments isVP={!!isVP} isNewMember={isNewMember} />
        </TabsContent>

        <TabsContent value="resources">
          <PDPResources isVP={!!isVP} />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
