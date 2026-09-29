const localTodayIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

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

// Guard sisi web untuk mencegah respons cache lama menampilkan paket yang
// sudah tidak layak tampil. Filter otoritatif tetap berada di backend.
export const isCustomerVisiblePackage = (pkg: any, today = localTodayIso()) => {
  if (!pkg || pkg.status !== 'Aktif') return false;
  const endDate = validIsoDate(pkg.endDate);
  if (!endDate || endDate < today) return false;
  const tripType = String(pkg.tripType || '').replace(/\s+/g, '').toLowerCase();
  if (tripType === 'opentrip') {
    const startDate = validIsoDate(pkg.startDate);
    if (!startDate || startDate < today) return false;
  }

  const provider = pkg.provider;
  if (provider && (provider.status !== 'APPROVED' || provider.isVerified === false)) return false;
  if (pkg.providerStatus && pkg.providerStatus !== 'APPROVED') return false;
  if (pkg.providerIsVerified === false) return false;
  return true;
};

export const filterCustomerVisiblePackages = <T,>(packages: T[], today = localTodayIso()): T[] =>
  packages.filter((pkg) => isCustomerVisiblePackage(pkg, today));
