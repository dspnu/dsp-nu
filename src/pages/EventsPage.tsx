import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, List, Download, Search } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { useAuth } from '@/contexts/AuthContext';
import { EventForm } from '@/components/events/EventForm';
import { EventCard } from '@/components/events/EventCard';
import { CalendarView } from '@/components/events/CalendarView';
import { EventDetailDialog } from '@/components/events/EventDetailDialog';
import { ManualAttendance } from '@/components/attendance/ManualAttendance';
import { downloadICS } from '@/lib/calendar';
import { Tables } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { org } from '@/config/org';

type Event = Tables<'events'>;

export default function EventsPage() {
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'list' | 'calendar'>('calendar');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showAttendance, setShowAttendance] = useState(false);
  const [showEventDetail, setShowEventDetail] = useState(false);
  
  const { data: events, isLoading } = useEvents();
  const { isAdminOrOfficer, profile } = useAuth();
  const { toast } = useToast();

  // Check if user has positions (for exec events visibility)
  const hasPositions = (profile?.positions?.length ?? 0) > 0;

  // Filter events: hide exec events from non-officers
  const filteredEvents = events?.filter(event => {
    // Hide exec events from members without positions
    if (event.category === 'exec' && !hasPositions) {
      return false;
    }
    // Apply search filter
    return (
      event.title.toLowerCase().includes(search.toLowerCase()) ||
      event.category.toLowerCase().includes(search.toLowerCase()) ||
      event.location?.toLowerCase().includes(search.toLowerCase())
    );
  }) ?? [];

  const upcomingEvents = filteredEvents.filter(
    event => new Date(event.start_time) >= new Date()
  );

  const pastEvents = filteredEvents.filter(
    event => new Date(event.start_time) < new Date()
  );

  const handleExportCalendar = () => {
    if (events) {
      downloadICS(events, org.calendar.exportFilename);
      toast({ title: 'Calendar exported successfully' });
    }
  };

  return (
    <AppLayout>
      <PageHeader title="Events" description="Chapter events and calendar">
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportCalendar} className="gap-2 h-9">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span> ICS
          </Button>
          {isAdminOrOfficer && <EventForm />}
        </div>
      </PageHeader>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 sm:h-9"
            />
          </div>
          <div className="flex gap-2 self-start">
            <Button
              variant={view === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('list')}
              className="gap-2 h-9"
            >
              <List className="h-4 w-4" />
              <span className="hidden xs:inline">List</span>
            </Button>
            <Button
              variant={view === 'calendar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('calendar')}
              className="gap-2 h-9"
            >
              <Calendar className="h-4 w-4" />
              <span className="hidden xs:inline">Calendar</span>
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading events...</div>
        ) : view === 'calendar' ? (
          <CalendarView
            events={filteredEvents}
            onEventClick={(event) => {
              setSelectedEvent(event);
              setShowEventDetail(true);
            }}
          />
        ) : (
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
              <TabsTrigger value="upcoming" className="text-xs sm:text-sm">Upcoming ({upcomingEvents.length})</TabsTrigger>
              <TabsTrigger value="past" className="text-xs sm:text-sm">Past ({pastEvents.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming" className="mt-4">
              {upcomingEvents.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="No upcoming events"
                  description="Events will appear here when officers create them."
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {upcomingEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onOpenAttendance={() => {
                        setSelectedEvent(event);
                        setShowAttendance(true);
                      }}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="past" className="mt-4">
              {pastEvents.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="No past events"
                  description="Past events will appear here."
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {pastEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onOpenAttendance={() => {
                        setSelectedEvent(event);
                        setShowAttendance(true);
                      }}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Event Detail Dialog */}
      <EventDetailDialog
        event={selectedEvent}
        open={showEventDetail}
        onOpenChange={(open) => {
          setShowEventDetail(open);
          if (!open) setSelectedEvent(null);
        }}
        onOpenAttendance={() => {
          setShowEventDetail(false);
          setShowAttendance(true);
        }}
      />

      {/* Attendance Dialog */}
      <Dialog open={showAttendance && !!selectedEvent} onOpenChange={(open) => {
        setShowAttendance(open);
        if (!open) setSelectedEvent(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title} — Record Attendance</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <ManualAttendance event={selectedEvent} />
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
