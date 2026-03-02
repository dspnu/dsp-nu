import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Coffee, ClipboardList, FolderOpen, LayoutGrid, BarChart3, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { PDPHome } from '@/components/pdp/PDPHome';
import { PDPCoffeeChats } from '@/components/pdp/PDPCoffeeChats';
import { PDPAssignments } from '@/components/pdp/PDPAssignments';
import { PDPResources } from '@/components/pdp/PDPResources';
import { PDPProgress } from '@/components/pdp/PDPProgress';

export default function PDPPage() {
  const { profile, isAdminOrOfficer } = useAuth();
  const [activeTab, setActiveTab] = useState('home');

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
      <div className="flex items-center justify-between mb-4">
        <PageHeader
          title="PDP"
          description="Professional Development Program — your hub for the new member process"
        />
        <Button variant="outline" size="sm" asChild>
          <Link to="/pdp/directory">
            <Users className="h-4 w-4 mr-1" />
            Member Directory
          </Link>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={`grid w-full max-w-2xl ${isVP ? 'grid-cols-5' : 'grid-cols-4'}`}>
          <TabsTrigger value="home" className="gap-1.5">
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Home</span>
          </TabsTrigger>
          <TabsTrigger value="coffee-chats" className="gap-1.5">
            <Coffee className="h-4 w-4" />
            <span className="hidden sm:inline">Coffee Chats</span>
          </TabsTrigger>
          <TabsTrigger value="assignments" className="gap-1.5">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Assignments</span>
          </TabsTrigger>
          <TabsTrigger value="resources" className="gap-1.5">
            <FolderOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Resources</span>
          </TabsTrigger>
          {isVP && (
            <TabsTrigger value="progress" className="gap-1.5">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Progress</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="home">
          <PDPHome isVP={!!isVP} isNewMember={isNewMember} onNavigateToAssignments={() => setActiveTab('assignments')} />
        </TabsContent>

        <TabsContent value="coffee-chats">
          <PDPCoffeeChats isVP={!!isVP} isNewMember={isNewMember} />
        </TabsContent>

        <TabsContent value="assignments">
          <PDPAssignments isVP={!!isVP} isNewMember={isNewMember} />
        </TabsContent>

        <TabsContent value="resources">
          <PDPResources isVP={!!isVP} />
        </TabsContent>

        {isVP && (
          <TabsContent value="progress">
            <PDPProgress />
          </TabsContent>
        )}
      </Tabs>
    </AppLayout>
  );
}
