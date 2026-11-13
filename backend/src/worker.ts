import 'dotenv/config';
import { aiWorker } from './services/aiWorker';
import { startAutomationScheduler } from './services/automationRunner';

console.log('AI worker started, waiting for jobs...');
const automationTimer = startAutomationScheduler();

async function shutdown(signal: string) {
  console.log(`Received ${signal}, shutting down worker`);
  clearInterval(automationTimer);
  await aiWorker.close();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
