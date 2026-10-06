import { dateRange, jakartaToday, tripEndDate, validDate } from './tripDates.ts';

export interface Departure { date: string; endDate: string; quotaUsed: number; seatsLeft: number; closed?: boolean }
interface ScheduledPackage { departureDates?: string[]; departures?: Departure[]; startDate?: string; duration?: number; quotaMax?: number; quotaUsed?: number }

export function upcomingDepartures(pkg: ScheduledPackage, today = jakartaToday()): Departure[] {
  if (Array.isArray(pkg.departures)) return pkg.departures.filter(d => validDate(d.date) && d.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  // A multi-date package requires server counts; never invent free seats.
  if (pkg.departureDates?.length) return [];
  const day = pkg.startDate;
  return validDate(day) && day >= today ? [{ date: day, endDate: tripEndDate(day, pkg.duration || 1), quotaUsed: Number(pkg.quotaUsed) || 0, seatsLeft: Math.max(0, (Number(pkg.quotaMax) || 0) - (Number(pkg.quotaUsed) || 0)) }] : [];
}

export function weeklyDepartures(start: string, end: string, weekdays: number[]): string[] {
  return dateRange(start, end).filter(day => weekdays.includes(new Date(`${day}T00:00:00Z`).getUTCDay()));
}
