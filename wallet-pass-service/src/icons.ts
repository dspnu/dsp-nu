import { PNG } from 'pngjs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pngSync = require('pngjs/lib/png-sync.js') as { write: (png: PNG) => Buffer };

export function solidPngBuffer(width: number, height: number, r: number, g: number, b: number): Buffer {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = 255;
    }
  }
  return pngSync.write(png);
}

export function defaultPassImages(): Record<string, Buffer> {
  const purple: [number, number, number] = [79, 70, 229];
  const [r, g, b] = purple;
  return {
    'icon.png': solidPngBuffer(29, 29, r, g, b),
    'icon@2x.png': solidPngBuffer(58, 58, r, g, b),
    'icon@3x.png': solidPngBuffer(87, 87, r, g, b),
    'logo.png': solidPngBuffer(160, 50, r, g, b),
    'logo@2x.png': solidPngBuffer(320, 100, r, g, b),
  };
}
