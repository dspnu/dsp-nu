import { QRCodeSVG } from 'qrcode.react';
import { Tables } from '@/integrations/supabase/types';

type EventTicket = Tables<'event_tickets'>;

interface TicketQrBlockProps {
  ticket: EventTicket;
}

export function TicketQrBlock({ ticket }: TicketQrBlockProps) {
  const verifyUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/tickets?verify=${encodeURIComponent(ticket.check_in_code)}`
      : '';

  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border bg-white p-4">
      <QRCodeSVG value={verifyUrl} size={180} level="H" includeMargin />
      <p className="font-mono text-xs text-center break-all text-muted-foreground max-w-[220px]">
        {ticket.check_in_code}
      </p>
    </div>
  );
}
