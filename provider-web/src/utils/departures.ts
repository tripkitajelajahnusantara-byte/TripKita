import { addDays, dateRange, jakartaToday, tripEndDate, validDate } from './tripDates.ts';

export interface Departure { date: string; endDate: string; quotaUsed: number; seatsLeft: number; closed?: boolean }
interface ScheduledPackage { departureDates?: string[]; departures?: Departure[]; startDate?: string; duration?: number; quotaMax?: number; quotaUsed?: number; tripType?: string; availableDates?: string[] }

export function upcomingDepartures(pkg: ScheduledPackage, today = jakartaToday()): Departure[] {
  if (Array.isArray(pkg.departures)) return pkg.departures.filter(d => validDate(d.date) && d.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  // A multi-date package requires server counts; never invent free seats.
  if (pkg.departureDates?.length) return [];
  const day = pkg.startDate;
  return validDate(day) && day >= today ? [{ date: day, endDate: tripEndDate(day, pkg.duration || 1), quotaUsed: Number(pkg.quotaUsed) || 0, seatsLeft: Math.max(0, (Number(pkg.quotaMax) || 0) - (Number(pkg.quotaUsed) || 0)) }] : [];
}

// Tanggal mulai yang masih bisa dipesan: jadwal Open Trip yang masih punya kursi,
// atau tanggal yang dibuka mitra untuk paket lain (wajib H-7, sama dengan halaman detail).
export function bookableDates(pkg: ScheduledPackage, today = jakartaToday()): string[] {
  if ((pkg.tripType || 'Open Trip') === 'Open Trip') return upcomingDepartures(pkg, today).filter(d => d.seatsLeft > 0 && !d.closed).map(d => d.date);
  const min = addDays(today, 7);
  return (pkg.availableDates || []).filter(day => validDate(day) && day >= min).sort();
}

// Tanggal terdekat dari target (sebelum atau sesudahnya); seri memilih yang lebih awal.
export function nearestDate(dates: readonly string[], target: string): string {
  const distance = (day: string) => Math.abs(Date.parse(day) - Date.parse(target));
  return [...dates].sort().reduce((best, day) => (!best || distance(day) < distance(best) ? day : best), '');
}

export function weeklyDepartures(start: string, end: string, weekdays: number[]): string[] {
  return dateRange(start, end).filter(day => weekdays.includes(new Date(`${day}T00:00:00Z`).getUTCDay()));
}
