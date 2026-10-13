import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { issueTicketPass, walletEnvStatus } from './issuePass.js';

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const app = express();
app.set('trust proxy', 1);

app.use(
  cors({
    origin(origin, cb) {
      if (ALLOWED_ORIGINS.length === 0) {
        cb(null, true);
        return;
      }
      if (origin && ALLOWED_ORIGINS.includes(origin)) {
        cb(null, true);
        return;
      }
      cb(null, false);
    },
  })
);

const limiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/pass', limiter);
app.use('/wallet', limiter);

function sendHealth(_req: express.Request, res: express.Response) {
  res.json({ ok: true, ...walletEnvStatus() });
}

app.get('/health', sendHealth);
app.get('/pass/health', sendHealth);

async function sendPass(req: express.Request, res: express.Response) {
  const ticketId = Array.isArray(req.params.ticketId) ? req.params.ticketId[0] : req.params.ticketId;
  const header = Array.isArray(req.headers.authorization)
    ? req.headers.authorization[0]
    : req.headers.authorization;
  const result = await issueTicketPass(ticketId ?? '', header);
  if ('pkpass' in result) {
    res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
    res.setHeader('Content-Disposition', 'attachment; filename="BrotherhoodTicket.pkpass"');
    res.status(200).send(result.pkpass);
    return;
  }
  res.status(result.status).json(result.json);
}

app.get('/pass/tickets/:ticketId', sendPass);
app.get('/wallet/tickets/:ticketId/pass', sendPass);

const port = Number(process.env.PORT) || 3333;
app.listen(port, () => {
  console.log(`wallet-pass-service listening on ${port}`);
});
