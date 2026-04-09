import { useState } from 'react';
import { AppLayout } from '@/core/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, List, Download, Search } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useEvents } from '@/features/events/hooks/useEvents';
import { useAuth } from '@/core/auth/AuthContext';
import { EventForm } from '@/features/events/components/EventForm';
import { EventCard } from '@/features/events/components/EventCard';
import { CalendarView } from '@/features/events/components/CalendarView';
import { EventDetailDialog } from '@/features/events/components/EventDetailDialog';
import { ManualAttendance } from '@/features/attendance/components/ManualAttendance';
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
      <PageHeader title="Events" className="mb-3 md:mb-4" />

      <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-center sm:gap-3">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search title, category, location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9"
            aria-label="Search events"
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(v) => {
              if (v === 'list' || v === 'calendar') setView(v);
            }}
            variant="outline"
            size="sm"
            className="justify-start"
          >
            <ToggleGroupItem value="calendar" aria-label="Calendar view" className="gap-1.5 px-2.5 sm:px-3">
              <Calendar className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Calendar</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List view" className="gap-1.5 px-2.5 sm:px-3">
              <List className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">List</span>
            </ToggleGroupItem>
          </ToggleGroup>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={handleExportCalendar}
                aria-label="Download calendar as .ics file"
              >
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Export .ics</TooltipContent>
          </Tooltip>

          {isAdminOrOfficer && <EventForm />}
        </div>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading events…</div>
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
            <TabsList className="grid h-9 w-full max-w-md grid-cols-2 sm:w-auto sm:inline-flex">
              <TabsTrigger value="upcoming" className="text-xs sm:text-sm">
                Upcoming ({upcomingEvents.length})
              </TabsTrigger>
              <TabsTrigger value="past" className="text-xs sm:text-sm">
                Past ({pastEvents.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming" className="mt-3 sm:mt-4">
              {upcomingEvents.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="No upcoming events"
                  description="Events will appear here when officers create them."
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
            <TabsContent value="past" className="mt-3 sm:mt-4">
              {pastEvents.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="No past events"
                  description="Past events will appear here."
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
