import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Camera, Keyboard, Loader2, SwitchCamera, X, Zap, ZapOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ensureCameraPermission } from '@/lib/nativeCamera';

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
  const [scannerOpen, setScannerOpen] = useState(false);
  const [manual, setManual] = useState(initialCode ?? '');

  useEffect(() => {
    if (initialCode) setManual(initialCode);
  }, [initialCode]);

  const submitManual = () => {
    const code = extractVerifyCode(manual) || manual.trim();
    if (code.length >= 8) onCode(code);
  };

  const handleScan = useCallback(
    (code: string) => {
      onCode(code);
      setScannerOpen(false);
    },
    [onCode]
  );

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
        <Button
          type="button"
          size="lg"
          onClick={() => setScannerOpen(true)}
          className="w-full gap-2 h-12"
        >
          <Camera className="h-5 w-5" />
          Scan ticket
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">or enter code</span>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Keyboard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Ticket code"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitManual()}
            />
          </div>
          <Button type="button" onClick={submitManual}>
            Go
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Scan the QR on a member&apos;s ticket or Apple Wallet pass, or type the code shown
          below it.
        </p>
      </CardContent>

      <Sheet open={scannerOpen} onOpenChange={setScannerOpen}>
        <SheetContent
          side="bottom"
          className="z-[110] h-[100dvh] max-h-[100dvh] w-full overflow-hidden border-0 bg-black p-0 text-white sm:max-w-none [&>button]:hidden"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Scan ticket QR code</SheetTitle>
          </SheetHeader>
          {scannerOpen && (
            <ScannerView onScan={handleScan} onClose={() => setScannerOpen(false)} />
          )}
        </SheetContent>
      </Sheet>
    </Card>
  );
}

interface ScannerViewProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

function ScannerView({ onScan, onClose }: ScannerViewProps) {
  const containerId = useId().replace(/:/g, '');
  const elementId = `ticket-scanner-${containerId}`;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [activeCamera, setActiveCamera] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [status, setStatus] = useState<'starting' | 'scanning' | 'error'>('starting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Discover cameras once (after native permission).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const allowed = await ensureCameraPermission();
      if (cancelled) return;
      if (!allowed) {
        setStatus('error');
        setErrorMessage('Camera permission denied. Enable camera access and try again.');
        return;
      }
      try {
        const devices = await Html5Qrcode.getCameras();
        if (cancelled) return;
        const list = devices.map((d) => ({ id: d.id, label: d.label || 'Camera' }));
        setCameras(list);
        const back =
          list.find((c) => /back|rear|environment/i.test(c.label)) ?? list[list.length - 1];
        setActiveCamera(back?.id ?? list[0]?.id ?? null);
      } catch (err: unknown) {
        if (cancelled) return;
        setStatus('error');
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Camera permission denied. Enable camera access and try again.'
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Start / restart scanner when active camera changes.
  useEffect(() => {
    if (!activeCamera) return;
    let stopped = false;
    const instance = new Html5Qrcode(elementId, { verbose: false });
    scannerRef.current = instance;

    const config = {
      fps: 12,
      disableFlip: false,
    };

    setStatus('starting');
    setTorchOn(false);

    instance
      .start(
        activeCamera,
        config,
        (decodedText) => {
          const code = extractVerifyCode(decodedText);
          if (!code) return;
          try {
            navigator.vibrate?.(40);
          } catch {
            /* ignore */
          }
          stopped = true;
          instance
            .stop()
            .catch(() => {})
            .finally(() => onScan(code));
        },
        () => {
          /* per-frame decode errors are noisy; ignore */
        }
      )
      .then(() => {
        if (stopped) return;
        setStatus('scanning');
        // Torch capability probe
        try {
          const trackSettings = (instance.getRunningTrackCameraCapabilities?.() as
            | { torchFeature?: () => { isSupported: () => boolean } }
            | undefined);
          const supported = !!trackSettings?.torchFeature?.()?.isSupported?.();
          setTorchSupported(supported);
        } catch {
          setTorchSupported(false);
        }
      })
      .catch((err) => {
        setStatus('error');
        setErrorMessage(err?.message ?? 'Unable to start the camera.');
      });

    return () => {
      stopped = true;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s && s.isScanning) {
        s.stop().catch(() => {});
      }
    };
  }, [activeCamera, elementId, onScan]);

  const switchCamera = () => {
    if (cameras.length < 2 || !activeCamera) return;
    const idx = cameras.findIndex((c) => c.id === activeCamera);
    const next = cameras[(idx + 1) % cameras.length];
    setActiveCamera(next.id);
  };

  const toggleTorch = async () => {
    const s = scannerRef.current;
    if (!s) return;
    try {
      const caps = s.getRunningTrackCameraCapabilities?.() as
        | { torchFeature?: () => { apply: (on: boolean) => Promise<void> } }
        | undefined;
      const torch = caps?.torchFeature?.();
      if (!torch) {
        toast({ title: 'Torch not available on this device' });
        return;
      }
      await torch.apply(!torchOn);
      setTorchOn((v) => !v);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not toggle torch';
      toast({ title: 'Torch error', description: message, variant: 'destructive' });
    }
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {/* Camera surface — library overlay is hidden; we draw our own frame */}
      <div id={elementId} className="ticket-scanner-camera absolute inset-0" />

      {/* Dim overlay with a single cut-out scanning frame, centered between chrome */}
      <div className="pointer-events-none absolute inset-0 flex flex-col">
        <div className="h-[calc(env(safe-area-inset-top,0px)+4.5rem)] shrink-0" />
        <div className="relative flex min-h-0 flex-1 items-center justify-center px-6">
          <div className="relative aspect-square w-[min(70vmin,100%)] max-w-[420px]">
            <div className="absolute inset-0 rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />
            {(
              [
                'top-0 left-0 border-l-[3px] border-t-[3px] rounded-tl-3xl',
                'top-0 right-0 border-r-[3px] border-t-[3px] rounded-tr-3xl',
                'bottom-0 left-0 border-l-[3px] border-b-[3px] rounded-bl-3xl',
                'bottom-0 right-0 border-r-[3px] border-b-[3px] rounded-br-3xl',
              ] as const
            ).map((cls, i) => (
              <span key={i} className={`absolute h-11 w-11 border-white ${cls}`} />
            ))}
            {status === 'scanning' && (
              <div className="absolute inset-4 overflow-hidden rounded-2xl">
                <div className="ticket-scan-line absolute inset-x-0 top-0 h-full">
                  <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-white to-transparent" />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="h-[calc(env(safe-area-inset-bottom,0px)+8.5rem)] shrink-0" />
      </div>

      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-11 w-11 rounded-full bg-white/10 text-white backdrop-blur-md hover:bg-white/20 hover:text-white"
        >
          <X className="h-5 w-5" />
        </Button>
        <p className="text-sm font-medium tracking-tight">Scan ticket</p>
        <div className="h-11 w-11" />
      </div>

      {/* Bottom controls */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-4 px-6 pb-[calc(env(safe-area-inset-bottom)+24px)]">
        <p className="rounded-full bg-black/40 px-3 py-1 text-xs text-white/80 backdrop-blur-md">
          {status === 'scanning'
            ? 'Align the QR code inside the frame'
            : status === 'starting'
              ? 'Starting camera…'
              : errorMessage ?? 'Camera unavailable'}
        </p>
        <div className="flex items-center gap-3">
          {torchSupported && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleTorch}
              className="h-12 w-12 rounded-full bg-white/10 text-white backdrop-blur-md hover:bg-white/20 hover:text-white"
            >
              {torchOn ? <ZapOff className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
            </Button>
          )}
          {cameras.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={switchCamera}
              className="h-12 w-12 rounded-full bg-white/10 text-white backdrop-blur-md hover:bg-white/20 hover:text-white"
            >
              <SwitchCamera className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {status === 'starting' && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white/80" />
        </div>
      )}

      <style>{`
        .ticket-scanner-camera {
          padding: 0 !important;
        }
        .ticket-scanner-camera,
        .ticket-scanner-camera > *,
        .ticket-scanner-camera video {
          width: 100% !important;
          height: 100% !important;
          border: 0 !important;
        }
        .ticket-scanner-camera video {
          position: absolute !important;
          inset: 0;
          object-fit: cover !important;
        }
        .ticket-scanner-camera canvas {
          opacity: 0 !important;
          pointer-events: none !important;
        }
        .ticket-scanner-camera #qr-shaded-region {
          display: none !important;
        }
        @keyframes ticket-scan {
          0%, 100% { transform: translateY(0); opacity: 0.25; }
          50% { transform: translateY(calc(100% - 2px)); opacity: 1; }
        }
        .ticket-scan-line {
          animation: ticket-scan 2.2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
