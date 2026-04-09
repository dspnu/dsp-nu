import { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, X } from 'lucide-react';

function extractVerifyCode(text: string): string | null {
  const t = text.trim();
  try {
    const url = new URL(t);
    const v = url.searchParams.get('verify');
    if (v) return v.trim();
  } catch {
    /* not a URL */
  }
  if (/^[a-f0-9]{32}$/i.test(t)) return t;
  return null;
}

interface TicketCheckInToolsProps {
  onCode: (code: string) => void;
  initialCode?: string | null;
  onClose?: () => void;
}

export function TicketCheckInTools({ onCode, initialCode, onClose }: TicketCheckInToolsProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [manual, setManual] = useState(initialCode ?? '');

  useEffect(() => {
    if (initialCode) setManual(initialCode);
  }, [initialCode]);

  useEffect(() => {
    if (!isScanning) return;

    const scanner = new Html5QrcodeScanner(
      'ticket-qr-reader',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scanner.render(
      (decodedText) => {
        const code = extractVerifyCode(decodedText);
        if (code) {
          onCode(code);
          scanner.clear().catch(console.error);
          setIsScanning(false);
        }
      },
      () => {}
    );

    return () => {
      scanner.clear().catch(console.error);
    };
  }, [isScanning, onCode]);

  const submitManual = () => {
    const code = extractVerifyCode(manual) || manual.trim();
    if (code.length >= 8) onCode(code);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">Check-in</CardTitle>
        {onClose && (
          <Button variant="ghost" size="icon" type="button" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {!isScanning ? (
          <Button type="button" onClick={() => setIsScanning(true)} className="w-full gap-2">
            <Camera className="h-4 w-4" />
            Scan ticket QR
          </Button>
        ) : (
          <div id="ticket-qr-reader" className="w-full" />
        )}
        <div className="flex gap-2">
          <Input
            placeholder="Or enter ticket code"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitManual()}
          />
          <Button type="button" onClick={submitManual}>
            Go
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Scan a member&apos;s ticket QR or type the code from their screen.
        </p>
      </CardContent>
    </Card>
  );
}
