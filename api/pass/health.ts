import { walletEnvStatus } from '../../wallet-pass-service/src/issuePass.js';

type Req = { method?: string; headers: { origin?: string } };
type Res = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => Res;
  json: (body: unknown) => void;
  end: () => void;
};

const DEFAULT_ORIGINS = [
  'https://dsp.jacobtartabini.com',
  'capacitor://localhost',
  'http://localhost:8080',
];

function allowOrigin(origin: string | undefined): string | null {
  if (!origin) return null;
  const extra = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return DEFAULT_ORIGINS.includes(origin) || extra.includes(origin) ? origin : null;
}

export function applyPassCors(req: Req, res: Res): boolean {
  const origin = allowOrigin(req.headers.origin);
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

export default function handler(req: Req, res: Res) {
  if (applyPassCors(req, res)) return;
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  const status = walletEnvStatus();
  res.status(status.ok ? 200 : 503).json(status);
}
