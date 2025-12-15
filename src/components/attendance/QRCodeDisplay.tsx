import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tables } from '@/integrations/supabase/types';
import { useToggleAttendanceOpen } from '@/hooks/useAttendance';

type Event = Tables<'events'>;

interface QRCodeDisplayProps {
  event: Event;
}

export function QRCodeDisplay({ event }: QRCodeDisplayProps) {
  const toggleAttendance = useToggleAttendanceOpen();
  
  const checkInUrl = `${window.location.origin}/events?checkin=${event.id}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Attendance QR Code</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Switch
            id="attendance-open"
            checked={event.attendance_open}
            onCheckedChange={(checked) => 
              toggleAttendance.mutate({ eventId: event.id, open: checked })
            }
          />
          <Label htmlFor="attendance-open">
            {event.attendance_open ? 'Check-in is OPEN' : 'Check-in is CLOSED'}
          </Label>
        </div>
        
        {event.attendance_open && (
          <div className="flex justify-center p-4 bg-white rounded-lg">
            <QRCodeSVG
              value={checkInUrl}
              size={200}
              level="H"
              includeMargin
            />
          </div>
        )}
        
        <p className="text-xs text-center text-muted-foreground">
          Members can scan this QR code to check in
        </p>
      </CardContent>
    </Card>
  );
}
