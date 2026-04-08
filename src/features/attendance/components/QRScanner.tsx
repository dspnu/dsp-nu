import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, X } from 'lucide-react';

interface QRScannerProps {
  onScan: (eventId: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (!isScanning) return;

    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scanner.render(
      (decodedText) => {
        // Extract event ID from URL
        const url = new URL(decodedText);
        const eventId = url.searchParams.get('checkin');
        if (eventId) {
          onScan(eventId);
          scanner.clear();
        }
      },
      (error) => {
        // Ignore scan errors
      }
    );

    scannerRef.current = scanner;

    return () => {
      scanner.clear().catch(console.error);
    };
  }, [isScanning, onScan]);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Scan QR Code</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isScanning ? (
          <Button onClick={() => setIsScanning(true)} className="w-full gap-2">
            <Camera className="h-4 w-4" />
            Start Scanning
          </Button>
        ) : (
          <div id="qr-reader" className="w-full" />
        )}
        <p className="text-xs text-center text-muted-foreground">
          Point your camera at the event QR code to check in
        </p>
      </CardContent>
    </Card>
  );
}
