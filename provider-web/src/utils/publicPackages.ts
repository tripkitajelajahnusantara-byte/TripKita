import { jakartaToday } from './tripDates.ts';

const validIsoDate = (value: unknown) => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return '';
  const [year, month, day] = trimmed.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day
    ? trimmed
    : '';
};

// Paket yang seluruh jadwalnya sudah lewat tetap ditampilkan sebagai referensi,
// tetapi tidak boleh dipesan. Dihitung ulang di web agar respons cache lama
// tidak membuat paket kedaluwarsa terlihat masih bisa dipesan.
export const isPackageExpired = (pkg: any, today = jakartaToday()) => {
  if (pkg?.isExpired) return true;
  const endDate = validIsoDate(pkg?.endDate);
  if (!endDate || endDate < today) return true;
  const tripType = String(pkg.tripType || '').replace(/\s+/g, '').toLowerCase();
  if (tripType !== 'opentrip') return false;
  const dates = pkg.departureDates?.length ? pkg.departureDates : [pkg.startDate];
  return !dates.some((day: string) => validIsoDate(day) && day >= today);
};

// Guard sisi web untuk mencegah respons cache lama menampilkan paket yang
// sudah tidak layak tampil. Filter otoritatif tetap berada di backend.
export const isCustomerVisiblePackage = (pkg: any) => {
  if (!pkg || pkg.status !== 'Aktif' || !validIsoDate(pkg.endDate)) return false;

  const provider = pkg.provider;
  if (provider && (provider.status !== 'APPROVED' || provider.isVerified === false)) return false;
  if (pkg.providerStatus && pkg.providerStatus !== 'APPROVED') return false;
  if (pkg.providerIsVerified === false) return false;
  return true;
};

export const filterCustomerVisiblePackages = <T,>(packages: T[]): T[] =>
  packages.filter((pkg) => isCustomerVisiblePackage(pkg));

// Paket yang masih bisa dipesan selalu didahulukan; urutan lain dipertahankan.
export const sortBookableFirst = <T,>(packages: T[], today = jakartaToday()): T[] =>
  [...packages].sort((a, b) => Number(isPackageExpired(a, today)) - Number(isPackageExpired(b, today)));
