import { format } from 'date-fns';
import { org } from '@/config/org';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  start_time: string;
  end_time?: string | null;
}

export function generateICS(events: CalendarEvent[]): string {
  const formatDate = (date: string) => {
    return format(new Date(date), "yyyyMMdd'T'HHmmss");
  };

  const escapeText = (text: string) => {
    return text.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');
  };

  const icsEvents = events.map(event => {
    const endTime = event.end_time || new Date(new Date(event.start_time).getTime() + 60 * 60 * 1000).toISOString();
    
    return `BEGIN:VEVENT
UID:${event.id}${org.calendar.uidSuffix}
DTSTAMP:${formatDate(new Date().toISOString())}
DTSTART:${formatDate(event.start_time)}
DTEND:${formatDate(endTime)}
SUMMARY:${escapeText(event.title)}
${event.description ? `DESCRIPTION:${escapeText(event.description)}` : ''}
${event.location ? `LOCATION:${escapeText(event.location)}` : ''}
END:VEVENT`;
  }).join('\n');

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//${org.calendar.prodId}//Chapter App//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${org.calendar.calName}
${icsEvents}
END:VCALENDAR`;
}

export function downloadICS(events: CalendarEvent[], filename: string = org.calendar.exportFilename) {
  const ics = generateICS(events);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.ics`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function generateGoogleCalendarUrl(event: CalendarEvent): string {
  const formatGoogleDate = (date: string) => format(new Date(date), "yyyyMMdd'T'HHmmss");
  const endTime = event.end_time || new Date(new Date(event.start_time).getTime() + 60 * 60 * 1000).toISOString();
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatGoogleDate(event.start_time)}/${formatGoogleDate(endTime)}`,
    details: event.description || '',
    location: event.location || '',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function generateOutlookUrl(event: CalendarEvent): string {
  const endTime = event.end_time || new Date(new Date(event.start_time).getTime() + 60 * 60 * 1000).toISOString();
  
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    startdt: event.start_time,
    enddt: endTime,
    body: event.description || '',
    location: event.location || '',
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}
