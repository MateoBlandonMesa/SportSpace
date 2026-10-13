const BOGOTA = 'America/Bogota';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day;
}

export function todayInBogota(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: BOGOTA });
}

export function shiftIsoDate(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return utc.toISOString().slice(0, 10);
}

export function formatDayLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12)).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function formatTimeBogota(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-CO', {
    timeZone: BOGOTA,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatDateTimeBogota(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    timeZone: BOGOTA,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatIntervalBogota(startsAt: string, endsAt: string): string {
  return `${formatDateTimeBogota(startsAt)} – ${formatTimeBogota(endsAt)}`;
}
