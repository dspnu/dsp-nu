import { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface AvatarCropDialogProps {
  file: File | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCropComplete: (blob: Blob) => void;
}

const CROP_SIZE = 320;
const OUTPUT_SIZE = 512;

export function AvatarCropDialog({ file, open, onOpenChange, onCropComplete }: AvatarCropDialogProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    setZoom(1);
    setPosition({ x: 0, y: 0 });

    const img = new Image();
    img.onload = () => {
      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
      imgRef.current = img;
    };
    img.src = url;

    return () => URL.revokeObjectURL(url);
  }, [file]);

  const baseScale = naturalSize.w && naturalSize.h
    ? Math.max(CROP_SIZE / naturalSize.w, CROP_SIZE / naturalSize.h)
    : 1;

  const imgW = naturalSize.w * baseScale * zoom;
  const imgH = naturalSize.h * baseScale * zoom;

  const clampPosition = useCallback((x: number, y: number) => {
    const maxX = Math.max(0, (imgW - CROP_SIZE) / 2);
    const maxY = Math.max(0, (imgH - CROP_SIZE) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    };
  }, [imgW, imgH]);

  useEffect(() => {
    setPosition(prev => clampPosition(prev.x, prev.y));
  }, [zoom, clampPosition]);

  const getClientPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if ('touches' in e && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if ('clientX' in e) {
      return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
    }
    return { x: 0, y: 0 };
  };

  const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setDragging(true);
    const { x, y } = getClientPos(e);
    setDragStart({ x: x - position.x, y: y - position.y });
  }, [position]);

  const handlePointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!dragging) return;
    e.preventDefault();
    const { x, y } = getClientPos(e);
    setPosition(clampPosition(x - dragStart.x, y - dragStart.y));
  }, [dragging, dragStart, clampPosition]);

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  const handleReset = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleCrop = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d')!;

    const totalScale = baseScale * zoom;

    const imgLeft = (CROP_SIZE - imgW) / 2 + position.x;
    const imgTop = (CROP_SIZE - imgH) / 2 + position.y;

    const srcX = -imgLeft / totalScale;
    const srcY = -imgTop / totalScale;
    const srcSize = CROP_SIZE / totalScale;

    ctx.beginPath();
    ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCropComplete(blob);
          onOpenChange(false);
        }
      },
      'image/jpeg',
      0.92,
    );
  }, [baseScale, zoom, imgW, imgH, position, onCropComplete, onOpenChange]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.002;
    setZoom(prev => Math.min(3, Math.max(1, prev + delta)));
  }, []);

  if (!imageSrc) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crop Photo</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-5">
          <div
            className="relative overflow-hidden rounded-full bg-muted cursor-grab active:cursor-grabbing touch-none"
            style={{ width: CROP_SIZE, height: CROP_SIZE, maxWidth: '100%', aspectRatio: '1' }}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
            onWheel={handleWheel}
          >
            <img
              src={imageSrc}
              alt="Crop preview"
              className="absolute pointer-events-none select-none"
              draggable={false}
              style={{
                width: imgW,
                height: imgH,
                left: (CROP_SIZE - imgW) / 2 + position.x,
                top: (CROP_SIZE - imgH) / 2 + position.y,
              }}
            />
            <div className="absolute inset-0 rounded-full ring-4 ring-primary/20 pointer-events-none" />
          </div>

          <div className="flex items-center gap-3 w-full px-4">
            <ZoomOut className="h-4 w-4 text-muted-foreground shrink-0" />
            <Slider
              value={[zoom]}
              onValueChange={([v]) => setZoom(v)}
              min={1}
              max={3}
              step={0.01}
              className="flex-1"
            />
            <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
            <button
              type="button"
              onClick={handleReset}
              className="ml-1 p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="Reset"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          <p className="text-xs text-muted-foreground text-center -mt-2">
            Drag to reposition. Scroll or use the slider to zoom.
          </p>

          <div className="flex gap-2 w-full">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleCrop}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
