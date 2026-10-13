import { issueTicketPass } from '../../../wallet-pass-service/src/issuePass.js';
import { applyPassCors } from '../health.js';

type Req = {
  method?: string;
  headers: { origin?: string; authorization?: string | string[] };
  query: { ticketId?: string | string[] };
};
type Res = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => Res;
  json: (body: unknown) => void;
  send: (body: Buffer) => void;
  end: () => void;
};

export default async function handler(req: Req, res: Res) {
  if (applyPassCors(req, res)) return;
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const rawId = req.query.ticketId;
  const ticketId = Array.isArray(rawId) ? rawId[0] : rawId;
  const authorization = Array.isArray(req.headers.authorization)
    ? req.headers.authorization[0]
    : req.headers.authorization;
  const result = await issueTicketPass(ticketId ?? '', authorization);

  if ('pkpass' in result) {
    res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
    res.setHeader('Content-Disposition', 'attachment; filename="BrotherhoodTicket.pkpass"');
    res.status(200).send(result.pkpass);
    return;
  }
  res.status(result.status).json(result.json);
}
