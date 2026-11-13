import 'express-async-errors';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import authRouter from './routes/auth';
import dashboardRouter from './routes/dashboard';
import contentRouter from './routes/content';
import videoRouter from './routes/video';
import affiliateRouter from './routes/affiliate';
import advertiserRouter from './routes/advertiser';
import teamRouter from './routes/team';
import workflowRouter from './routes/workflow';
import subscriptionRouter from './routes/subscription';
import walletRouter from './routes/wallet';
import adminRouter from './routes/admin';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/dashboard', dashboardRouter);
app.use('/api/v1/content', contentRouter);
app.use('/api/v1/video', videoRouter);
app.use('/api/v1/affiliate', affiliateRouter);
app.use('/api/v1/advertiser', advertiserRouter);
app.use('/api/v1/team', teamRouter);
app.use('/api/v1/workflow', workflowRouter);
app.use('/api/v1/subscription', subscriptionRouter);
app.use('/api/v1/wallet', walletRouter);
app.use('/api/v1/admin', adminRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Body JSON tidak valid' });
  }
  if (err?.code === 'P2002') {
    return res.status(409).json({ error: 'Data sudah ada (duplikat)' });
  }
  if (err?.code === 'P2025') {
    return res.status(404).json({ error: 'Data tidak ditemukan' });
  }
  if (err?.code === 'P2003') {
    return res.status(400).json({ error: 'Relasi data tidak valid' });
  }
  const status = Number(err?.status) || 500;
  if (status >= 500) {
    console.error('Unhandled error:', err);
    return res.status(status).json({ error: 'Internal server error' });
  }
  res.status(status).json({ error: err.message || 'Permintaan gagal' });
});

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
