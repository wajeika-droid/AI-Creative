import { prisma } from '../lib/prisma';
import { assertQuota, submitAIJob } from './aiProvider';
import { computeNextRun, isScheduleType } from './automationSchedule';

const TICK_MS = 60_000;
let ticking = false;

async function notify(userId: string, title: string, body: string) {
  await prisma.notification.create({ data: { userId, title, body } }).catch(() => undefined);
}

async function runDueAutomations() {
  if (ticking) return;
  ticking = true;
  try {
    const now = new Date();
    const due = await prisma.automation.findMany({
      where: { enabled: true, nextRunAt: { lte: now } },
      orderBy: { nextRunAt: 'asc' },
      take: 10,
    });

    for (const item of due) {
      // Advancing nextRunAt is the claim: a second tick or another worker
      // instance will not see this automation as due anymore.
      const claim = await prisma.automation.updateMany({
        where: { id: item.id, enabled: true, nextRunAt: item.nextRunAt },
        data: {
          lastRunAt: now,
          nextRunAt: computeNextRun(
            isScheduleType(item.scheduleType) ? item.scheduleType : 'daily',
            item.timeOfDay,
            item.dayOfWeek,
            now
          ),
        },
      });
      if (claim.count === 0) continue;

      try {
        await assertQuota(item.userId);
        const job = await submitAIJob({
          userId: item.userId,
          providerId: process.env.DEFAULT_VIDEO_PROVIDER_ID || '',
          type: 'video_render',
          input: { ...(item.input as Record<string, unknown>), automationId: item.id },
        });
        await prisma.automation.update({ where: { id: item.id }, data: { lastJobId: job.id } });
        console.log(`Automation ${item.id} menjadwalkan job ${job.id}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`Automation ${item.id} gagal: ${message}`);
        await notify(item.userId, 'Otomasi render gagal', `"${item.name}" tidak dapat dijalankan: ${message}`);
      }
    }
  } catch (error) {
    console.error('Automation scheduler error:', error);
  } finally {
    ticking = false;
  }
}

export function startAutomationScheduler() {
  console.log('Automation scheduler started (tick 60s, Asia/Jakarta)');
  void runDueAutomations();
  const timer = setInterval(() => void runDueAutomations(), TICK_MS);
  timer.unref?.();
  return timer;
}
