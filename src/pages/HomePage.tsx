import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, Users, Award, Briefcase, Coffee, Vote, 
  Clock, MapPin, AlertCircle, CheckCircle2, ChevronRight 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEvents } from '@/hooks/useEvents';
import { useServiceHours } from '@/hooks/useServiceHours';
import { useMyCoffeeChats } from '@/hooks/useCoffeeChats';
import { useMemberPoints } from '@/hooks/useMembers';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, isAfter, isBefore, addDays, startOfDay } from 'date-fns';

const quickLinks = [
  { icon: Calendar, label: 'Events', path: '/events', color: 'text-category-chapter' },
  { icon: Users, label: 'People', path: '/people', color: 'text-category-service' },
  { icon: Award, label: 'Chapter', path: '/chapter', color: 'text-secondary' },
  { icon: Briefcase, label: 'Development', path: '/development', color: 'text-category-professionalism' },
];

export default function HomePage() {
  const { profile, user } = useAuth();
  
  // Fetch user's points
  const { data: userPoints } = useMemberPoints(user?.id || '');
  const totalPoints = userPoints?.reduce((sum, p) => sum + p.points, 0) || 0;
  
  // Fetch user's service hours
  const { data: serviceHours } = useServiceHours(user?.id);
  const totalServiceHours = serviceHours?.reduce((sum, h) => sum + Number(h.hours), 0) || 0;
  const verifiedServiceHours = serviceHours?.filter(h => h.verified).reduce((sum, h) => sum + Number(h.hours), 0) || 0;
  
  // Fetch upcoming events
  const { data: allEvents } = useEvents();
  const now = new Date();
  const upcomingEvents = allEvents?.filter(e => isAfter(new Date(e.start_time), now))
    .slice(0, 3) || [];
  const nextWeekEvents = allEvents?.filter(e => {
    const eventDate = new Date(e.start_time);
    return isAfter(eventDate, now) && isBefore(eventDate, addDays(startOfDay(now), 7));
  }) || [];
  
  // Fetch coffee chats
  const { data: myCoffeeChats } = useMyCoffeeChats();
  const pendingCoffeeChats = myCoffeeChats?.filter(c => c.status === 'pending') || [];
  const confirmedCoffeeChats = myCoffeeChats?.filter(c => c.status === 'confirmed') || [];
  
  // Fetch EOP candidates with open voting
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

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="gradient-hero rounded-2xl p-6 md:p-8 text-primary-foreground">
          <h1 className="font-display text-2xl md:text-3xl font-bold mb-2">
            Welcome back, {profile?.first_name || 'Brother'}!
          </h1>
          <p className="text-primary-foreground/80">
            Delta Sigma Pi - Nu Chapter Portal
          </p>
        </div>

        {/* Alerts Section */}
        {(hasActiveVoting || pendingCoffeeChats.length > 0) && (
          <div className="space-y-2">
            {hasActiveVoting && (
              <Link to="/chapter">
                <Card className="border-category-dei/50 bg-category-dei/5 hover:bg-category-dei/10 transition-colors cursor-pointer">
                  <CardContent className="flex items-center gap-3 p-4">
                    <Vote className="h-5 w-5 text-category-dei" />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">EOP Voting is Open</p>
                      <p className="text-sm text-muted-foreground">Cast your vote for new member candidates</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            )}
            {pendingCoffeeChats.length > 0 && (
              <Link to="/development">
                <Card className="border-category-brotherhood/50 bg-category-brotherhood/5 hover:bg-category-brotherhood/10 transition-colors cursor-pointer">
                  <CardContent className="flex items-center gap-3 p-4">
                    <Coffee className="h-5 w-5 text-category-brotherhood" />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{pendingCoffeeChats.length} Pending Coffee Chat{pendingCoffeeChats.length !== 1 ? 's' : ''}</p>
                      <p className="text-sm text-muted-foreground">Waiting for confirmation</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickLinks.map(({ icon: Icon, label, path, color }) => (
            <Link key={path} to={path}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="flex flex-col items-center justify-center p-4 text-center">
                  <Icon className={`h-6 w-6 mb-2 ${color}`} />
                  <span className="text-sm font-medium">{label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Award className="h-4 w-4" />
                Your Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{totalPoints}</p>
              <p className="text-xs text-muted-foreground">Total earned</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Service Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{verifiedServiceHours}</p>
              <p className="text-xs text-muted-foreground">
                {totalServiceHours > verifiedServiceHours && (
                  <span className="text-amber-600">+{(totalServiceHours - verifiedServiceHours).toFixed(1)} pending</span>
                )}
                {totalServiceHours === verifiedServiceHours && 'Verified hours'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Coffee className="h-4 w-4" />
                Coffee Chats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{confirmedCoffeeChats.length}</p>
              <p className="text-xs text-muted-foreground">Confirmed this semester</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{nextWeekEvents.length}</p>
              <p className="text-xs text-muted-foreground">Next 7 days</p>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Events */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Upcoming Events</CardTitle>
            <Link to="/events">
              <Button variant="ghost" size="sm" className="gap-1">
                View All <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No upcoming events</p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex-shrink-0 w-12 text-center">
                      <p className="text-xs text-muted-foreground uppercase">{format(new Date(event.start_time), 'MMM')}</p>
                      <p className="text-xl font-bold">{format(new Date(event.start_time), 'd')}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium truncate">{event.title}</p>
                        {event.is_required && (
                          <Badge variant="destructive" className="text-xs">Required</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(event.start_time), 'h:mm a')}
                        </span>
                        {event.location && (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize flex-shrink-0">
                      {event.category}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
