import 'dotenv/config';
import { aiWorker } from './services/aiProvider';

console.log('AI worker started, waiting for jobs...');

async function shutdown(signal: string) {
  console.log(`Received ${signal}, shutting down worker`);
  await aiWorker.close();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
