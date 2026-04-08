import { useParams, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { CategoryBadge } from '@/components/ui/category-badge';
import { org } from '@/config/org';
import { EmptyState } from '@/components/ui/empty-state';
import { 
  Mail, Phone, GraduationCap, Linkedin, MapPin, Users, Heart, 
  ArrowLeft, Coffee, Calendar, Award, Clock, User, CheckCircle
} from 'lucide-react';
import { useMembers, useMemberPoints } from '@/hooks/useMembers';
import { useServiceHours } from '@/hooks/useServiceHours';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

export default function MemberProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user, isAdminOrOfficer } = useAuth();
  const { data: members } = useMembers();
  
  const member = members?.find(m => m.id === id);
  
  const canViewDetails = isAdminOrOfficer || user?.id === member?.user_id;
  
  const { data: memberPoints } = useMemberPoints(member?.user_id ?? '');
  const { data: serviceHours } = useServiceHours(member?.user_id);
  
  // Fetch coffee chats
  const { data: coffeeChats } = useQuery({
    queryKey: ['member-coffee-chats', member?.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coffee_chats')
        .select('*')
        .or(`initiator_id.eq.${member!.user_id},partner_id.eq.${member!.user_id}`)
        .order('chat_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!member?.user_id && canViewDetails,
  });

  // Fetch attendance
  const { data: attendance } = useQuery({
    queryKey: ['member-attendance', member?.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select('*, events(*)')
        .eq('user_id', member!.user_id)
        .order('checked_in_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!member?.user_id && canViewDetails,
  });

  // Fetch user roles
  const { data: roles } = useQuery({
    queryKey: ['member-roles', member?.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', member!.user_id);
      if (error) throw error;
      return data?.map(r => r.role) ?? [];
    },
    enabled: !!member?.user_id,
  });

  if (!member) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">Member not found</p>
          <Button asChild variant="link" className="mt-4">
            <Link to="/people">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to People
            </Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  const bigMember = members?.find(m => m.id === member.big);
  const littleMember = members?.find(m => m.id === member.little);
  
  const totalPoints = memberPoints?.reduce((sum, p) => sum + p.points, 0) ?? 0;
  const pointsByCategory = memberPoints?.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + p.points;
    return acc;
  }, {} as Record<string, number>) ?? {};
  
  const totalServiceHours = serviceHours?.reduce((sum, h) => sum + Number(h.hours), 0) ?? 0;
  const verifiedServiceHours = serviceHours?.filter(h => h.verified).reduce((sum, h) => sum + Number(h.hours), 0) ?? 0;

  const confirmedChats = coffeeChats?.filter(c => c.status === 'completed').length ?? 0;

  // Get partner names for coffee chats
  const getChatPartnerName = (chat: any) => {
    const partnerId = chat.initiator_id === member.user_id ? chat.partner_id : chat.initiator_id;
    const partner = members?.find(m => m.user_id === partnerId);
    return partner ? `${partner.first_name} ${partner.last_name}` : 'Unknown';
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link to="/people">
            <ArrowLeft className="h-4 w-4" />
            Back to People
          </Link>
        </Button>
      </div>

      {/* Profile Header */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={member.avatar_url || ''} />
              <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                {member.first_name?.[0]}{member.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-3">
              <div>
                <h1 className="text-2xl font-bold">
                  {member.first_name} {member.last_name}
                </h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <StatusBadge status={member.status} />
                  {roles?.map(role => (
                    <Badge key={role} variant="outline" className="capitalize">
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
              
              {member.positions && member.positions.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {member.positions.map((pos) => (
                    <Badge key={pos} variant="secondary">
                      {pos}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Quick Stats */}
              {canViewDetails && (
                <div className="flex gap-4 pt-2">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{totalPoints}</div>
                    <div className="text-xs text-muted-foreground">Points</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{verifiedServiceHours}</div>
                    <div className="text-xs text-muted-foreground">Service Hours</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{confirmedChats}</div>
                    <div className="text-xs text-muted-foreground">Coffee Chats</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{attendance?.length ?? 0}</div>
                    <div className="text-xs text-muted-foreground">Events Attended</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="contact" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 max-w-xl">
          <TabsTrigger value="contact" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Contact</span>
          </TabsTrigger>
          <TabsTrigger value="chapter" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Chapter</span>
          </TabsTrigger>
          {canViewDetails && (
            <>
              <TabsTrigger value="coffee" className="gap-2">
                <Coffee className="h-4 w-4" />
                <span className="hidden sm:inline">Coffee Chats</span>
              </TabsTrigger>
              <TabsTrigger value="attendance" className="gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Attendance</span>
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* Contact Tab */}
        <TabsContent value="contact" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${member.email}`} className="hover:underline">
                    {member.email}
                  </a>
                </div>
                {member.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{member.phone}</span>
                  </div>
                )}
                {member.hometown && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{member.hometown}</span>
                  </div>
                )}
                {member.linkedin_url && (
                  <div className="flex items-center gap-3">
                    <Linkedin className="h-4 w-4 text-muted-foreground" />
                    <a 
                      href={member.linkedin_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:underline text-primary"
                    >
                      LinkedIn Profile
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Academic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {member.major && (
                  <div className="flex items-center gap-3">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    <span>{member.major}</span>
                  </div>
                )}
                {member.graduation_year && (
                  <div className="flex items-center gap-3">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    <span>Class of {member.graduation_year}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Points Breakdown */}
          {canViewDetails && memberPoints && memberPoints.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Points Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
                  {org.eventCategories.map(c => c.key).map((cat) => (
                    <div key={cat} className="text-center p-3 rounded-lg bg-muted/50">
                      <CategoryBadge category={cat as any} />
                      <div className="text-xl font-bold mt-2">{pointsByCategory[cat] || 0}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Chapter Tab */}
        <TabsContent value="chapter" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Chapter Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {member.pledge_class && (
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>Pledge Class: {member.pledge_class}</span>
                  </div>
                )}
                {member.family && (
                  <div className="flex items-center gap-3">
                    <Heart className="h-4 w-4 text-muted-foreground" />
                    <span>Family: {member.family}</span>
                  </div>
                )}
                {bigMember && (
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-sm w-12">Big:</span>
                    <Link to={`/people/${bigMember.id}`} className="hover:underline text-primary">
                      {bigMember.first_name} {bigMember.last_name}
                    </Link>
                  </div>
                )}
                {littleMember && (
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-sm w-12">Little:</span>
                    <Link to={`/people/${littleMember.id}`} className="hover:underline text-primary">
                      {littleMember.first_name} {littleMember.last_name}
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Committees</CardTitle>
              </CardHeader>
              <CardContent>
                {member.committees && member.committees.length > 0 ? (
                  <div className="flex gap-2 flex-wrap">
                    {member.committees.map((committee) => (
                      <Badge key={committee} variant="outline">
                        {committee}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No committees assigned</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Coffee Chats Tab */}
        {canViewDetails && (
          <TabsContent value="coffee" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Coffee className="h-5 w-5" />
                  Coffee Chat History ({confirmedChats} confirmed)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {coffeeChats && coffeeChats.length > 0 ? (
                  <div className="space-y-3">
                    {coffeeChats.map((chat) => (
                      <div 
                        key={chat.id} 
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <Coffee className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{getChatPartnerName(chat)}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(chat.chat_date), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                        <Badge 
                          variant={chat.status === 'completed' ? 'default' : 
                                   chat.status === 'emailed' ? 'secondary' : 'outline'}
                        >
                          {chat.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Coffee}
                    title="No coffee chats yet"
                    description="Coffee chats will appear here when logged."
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Attendance Tab */}
        {canViewDetails && (
          <TabsContent value="attendance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Attendance Record ({attendance?.length ?? 0} events)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {attendance && attendance.length > 0 ? (
                  <div className="space-y-3">
                    {attendance.map((record: any) => (
                      <div 
                        key={record.id} 
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                          <div>
                            <p className="font-medium">{record.events?.title ?? 'Unknown Event'}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(record.checked_in_at), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                        </div>
                        {record.events?.category && (
                          <CategoryBadge category={record.events.category} />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Calendar}
                    title="No attendance records"
                    description="Attendance records will appear here after check-ins."
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </AppLayout>
  );
}
