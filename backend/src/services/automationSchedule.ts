const JAKARTA_OFFSET_MS = 7 * 3600 * 1000;
const DAY_MS = 24 * 3600 * 1000;

export type ScheduleType = 'daily' | 'weekly';

export function isScheduleType(value: unknown): value is ScheduleType {
  return value === 'daily' || value === 'weekly';
}

export function isValidTime(value: unknown) {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

// Asia/Jakarta has no DST, so a fixed UTC+7 offset is exact and avoids
// depending on tzdata inside the container.
export function computeNextRun(
  scheduleType: ScheduleType,
  timeOfDay: string,
  dayOfWeek: number | null | undefined,
  from = new Date()
) {
  const [hours, minutes] = timeOfDay.split(':').map(Number);
  const shiftedNow = from.getTime() + JAKARTA_OFFSET_MS;
  const local = new Date(shiftedNow);

  let candidate = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate(),
    hours,
    minutes,
    0,
    0
  );
  if (candidate <= shiftedNow) candidate += DAY_MS;

  if (scheduleType === 'weekly') {
    const target = dayOfWeek ?? 0;
    const diff = (target - new Date(candidate).getUTCDay() + 7) % 7;
    candidate += diff * DAY_MS;
  }

  return new Date(candidate - JAKARTA_OFFSET_MS);
}
