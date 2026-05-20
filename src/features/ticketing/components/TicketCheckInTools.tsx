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
          className="h-[100dvh] max-h-[100dvh] w-full p-0 border-0 bg-black text-white sm:max-w-none"
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

  // Discover cameras once.
  useEffect(() => {
    let cancelled = false;
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (cancelled) return;
        const list = devices.map((d) => ({ id: d.id, label: d.label || 'Camera' }));
        setCameras(list);
        const back =
          list.find((c) => /back|rear|environment/i.test(c.label)) ?? list[list.length - 1];
        setActiveCamera(back?.id ?? list[0]?.id ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus('error');
        setErrorMessage(
          err?.message ?? 'Camera permission denied. Enable camera access and try again.'
        );
      });
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
      qrbox: (vw: number, vh: number) => {
        const min = Math.min(vw, vh);
        const size = Math.floor(min * 0.7);
        return { width: size, height: size };
      },
      aspectRatio: window.innerWidth / window.innerHeight,
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
      {/* Camera surface */}
      <div id={elementId} className="absolute inset-0 [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />

      {/* Dim overlay with cut-out scanning frame */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative aspect-square w-[70vmin] max-w-[420px]">
          <div className="absolute inset-0 rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />
          {/* Corner brackets */}
          {(
            [
              'top-0 left-0 border-l-2 border-t-2 rounded-tl-3xl',
              'top-0 right-0 border-r-2 border-t-2 rounded-tr-3xl',
              'bottom-0 left-0 border-l-2 border-b-2 rounded-bl-3xl',
              'bottom-0 right-0 border-r-2 border-b-2 rounded-br-3xl',
            ] as const
          ).map((cls, i) => (
            <span key={i} className={`absolute h-10 w-10 border-white/90 ${cls}`} />
          ))}
          {/* Animated scan line */}
          {status === 'scanning' && (
            <div className="absolute inset-x-4 top-0 h-[2px] animate-[ticket-scan_2.2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white to-transparent" />
          )}
        </div>
      </div>

      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-11 w-11 rounded-full bg-white/10 text-white backdrop-blur-md hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </Button>
        <p className="text-sm font-medium tracking-tight">Scan ticket</p>
        <div className="h-11 w-11" />
      </div>

      {/* Bottom controls */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-4 px-6 pb-[calc(env(safe-area-inset-bottom)+24px)]">
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
              className="h-12 w-12 rounded-full bg-white/10 text-white backdrop-blur-md hover:bg-white/20"
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
              className="h-12 w-12 rounded-full bg-white/10 text-white backdrop-blur-md hover:bg-white/20"
            >
              <SwitchCamera className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {status === 'starting' && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white/80" />
        </div>
      )}

      <style>{`
        @keyframes ticket-scan {
          0% { transform: translateY(0); opacity: 0.2; }
          50% { transform: translateY(calc(70vmin - 4px)); opacity: 1; }
          100% { transform: translateY(0); opacity: 0.2; }
        }
      `}</style>
    </div>
  );
}
