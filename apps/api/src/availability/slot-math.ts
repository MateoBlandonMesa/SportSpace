export const TIME_ZONE = 'America/Bogota';
export const SLOT_MINUTES = 60;
const BOGOTA_OFFSET = '-05:00';

export type TimeSlot = {
  startsAt: Date;
  endsAt: Date;
};

export function isValidIsoDate(date: string): boolean {
  const [year, month, day] = date.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day;
}

export function bogotaDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00${BOGOTA_OFFSET}`);
}

export function bogotaDateOf(instant: Date): string {
  return instant.toLocaleDateString('en-CA', { timeZone: TIME_ZONE });
}

export function addDays(date: string, amount: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + amount));
  return utc.toISOString().slice(0, 10);
}

export function isoDayOfWeek(date: string): number {
  const noon = bogotaDateTime(date, '12:00');
  const jsDay = noon.getUTCDay();
  return jsDay === 0 ? 7 : jsDay;
}

export function mondayOfWeek(date: string): string {
  return addDays(date, 1 - isoDayOfWeek(date));
}

export function weekDates(monday: string): string[] {
  return [0, 1, 2, 3, 4, 5, 6].map((offset) => addDays(monday, offset));
}

export function buildSlots(date: string, startTime: string, endTime: string): TimeSlot[] {
  const slots: TimeSlot[] = [];
  let cursor = bogotaDateTime(date, startTime);
  const end = bogotaDateTime(date, endTime);
  const step = SLOT_MINUTES * 60 * 1000;

  while (cursor.getTime() + step <= end.getTime()) {
    const next = new Date(cursor.getTime() + step);
    slots.push({ startsAt: cursor, endsAt: next });
    cursor = next;
  }

  return slots;
}

export function uniqueByStart(slots: TimeSlot[]): TimeSlot[] {
  const seen = new Map<number, TimeSlot>();
  for (const slot of slots) {
    seen.set(slot.startsAt.getTime(), slot);
  }
  return [...seen.values()].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

export function overlaps(slot: TimeSlot, startsAt: Date | null, endsAt: Date | null): boolean {
  if (!startsAt || !endsAt) {
    return false;
  }
  return startsAt < slot.endsAt && endsAt > slot.startsAt;
}
