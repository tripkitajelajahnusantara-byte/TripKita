// Keep calendar dates as YYYY-MM-DD; display labels never enter API payloads.
export function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
export function addDays(date: string, days: number): string {
  if (!validDate(date) || !Number.isInteger(days)) return '';
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function jakartaToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  return ['year', 'month', 'day'].map(type => parts.find(p => p.type === type)!.value).join('-');
}
export function threeMonthLimit(today = jakartaToday()): string {
  const d = new Date(`${today}T00:00:00Z`);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 4, 0)).getUTCDate();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 3, Math.min(d.getUTCDate(), lastDay))).toISOString().slice(0, 10);
}
export function dateRange(start: string, end: string): string[] {
  if (!validDate(start) || !validDate(end) || end < start) return [];
  const days = Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
  if (days > 100 || days < 1) return [];
  return Array.from({ length: days }, (_, i) => addDays(start, i));
}
export function rangeAvailable(start: string, end: string, min: string, max: string, available?: readonly string[], booked: readonly string[] = []): boolean {
  const days = dateRange(start, end);
  return days.length > 0 && start >= min && end <= max && days.every(day => !booked.includes(day) && (available === undefined || available.includes(day)));
}
export function tripEndDate(start: string, duration: number): string {
  return addDays(start, Math.max(1, Math.trunc(Number(duration) || 1)) - 1);
}
export function formatTripRange(start: string, end?: string): string {
  if (!validDate(start)) return 'Belum dipilih';
  const format = (date: string) => new Intl.DateTimeFormat('id-ID', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T00:00:00Z`));
  return end && validDate(end) && end !== start ? `${format(start)} – ${format(end)}` : format(start);
}
export function bookingTimestamp(date: string): string {
  if (!validDate(date)) throw new Error('Pilih kembali tanggal perjalanan melalui kalender paket.');
  return `${date}T08:00:00+07:00`;
}
