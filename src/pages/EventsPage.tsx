import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, List, Download, Search, QrCode } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { useCheckIn } from '@/hooks/useAttendance';
import { useAuth } from '@/contexts/AuthContext';
import { EventForm } from '@/components/events/EventForm';
import { EventCard } from '@/components/events/EventCard';
import { CalendarView } from '@/components/events/CalendarView';
import { EventDetailDialog } from '@/components/events/EventDetailDialog';
import { QRCodeDisplay } from '@/components/attendance/QRCodeDisplay';
import { QRScanner } from '@/components/attendance/QRScanner';
import { AttendanceList } from '@/components/attendance/AttendanceList';
import { ManualAttendanceDialog } from '@/components/attendance/ManualAttendanceDialog';
import { downloadICS } from '@/lib/calendar';
import { Tables } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

type Event = Tables<'events'>;

export default function EventsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'list' | 'calendar'>('calendar');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showAttendance, setShowAttendance] = useState(false);
  const [showEventDetail, setShowEventDetail] = useState(false);
  
  const { data: events, isLoading } = useEvents();
  const { user, isAdminOrOfficer } = useAuth();
  const checkIn = useCheckIn();
  const { toast } = useToast();

  // Handle QR code check-in from URL
  useEffect(() => {
    const checkinEventId = searchParams.get('checkin');
    if (checkinEventId && user) {
      checkIn.mutate(
        { eventId: checkinEventId, userId: user.id },
        {
          onSuccess: () => {
            setSearchParams({});
          },
        }
      );
    }
  }, [searchParams, user]);

  const filteredEvents = events?.filter(event =>
    event.title.toLowerCase().includes(search.toLowerCase()) ||
    event.category.toLowerCase().includes(search.toLowerCase()) ||
    event.location?.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const upcomingEvents = filteredEvents.filter(
    event => new Date(event.start_time) >= new Date()
  );

  const pastEvents = filteredEvents.filter(
    event => new Date(event.start_time) < new Date()
  );

  const handleExportCalendar = () => {
    if (events) {
      downloadICS(events, 'dsp-nu-events');
      toast({ title: 'Calendar exported successfully' });
    }
  };

  const handleQRScan = (eventId: string) => {
    if (user) {
      checkIn.mutate({ eventId, userId: user.id });
      setShowScanner(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader title="Events" description="Chapter events and calendar">
        <div className="flex gap-2 flex-wrap">
          {user && (
            <Button variant="outline" size="sm" onClick={() => setShowScanner(true)} className="gap-2">
              <QrCode className="h-4 w-4" />
              Scan QR
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleExportCalendar} className="gap-2">
            <Download className="h-4 w-4" />
            Export ICS
          </Button>
          {isAdminOrOfficer && <EventForm />}
        </div>
      </PageHeader>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={view === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('list')}
              className="gap-2"
            >
              <List className="h-4 w-4" />
              List
            </Button>
            <Button
              variant={view === 'calendar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('calendar')}
              className="gap-2"
            >
              <Calendar className="h-4 w-4" />
              Calendar
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
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming ({upcomingEvents.length})</TabsTrigger>
              <TabsTrigger value="past">Past ({pastEvents.length})</TabsTrigger>
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

      {/* QR Scanner Dialog */}
      <Dialog open={showScanner} onOpenChange={setShowScanner}>
        <DialogContent className="max-w-md">
          <QRScanner onScan={handleQRScan} onClose={() => setShowScanner(false)} />
        </DialogContent>
      </Dialog>

      {/* Attendance Dialog */}
      <Dialog open={showAttendance && !!selectedEvent} onOpenChange={(open) => {
        setShowAttendance(open);
        if (!open) setSelectedEvent(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title} - Attendance</DialogTitle>
          </DialogHeader>
          {selectedEvent && isAdminOrOfficer && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <ManualAttendanceDialog event={selectedEvent} />
              </div>
              <QRCodeDisplay event={selectedEvent} />
              <AttendanceList eventId={selectedEvent.id} eventTitle={selectedEvent.title} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
