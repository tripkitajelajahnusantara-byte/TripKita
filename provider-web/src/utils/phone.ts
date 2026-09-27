const MAX_LOCAL_PHONE_DIGITS = 12;

export const getIndonesianLocalPhone = (value: string): string => {
  const digits = String(value || '').replace(/\D/g, '');
  const withoutCountryCode = digits.startsWith('62')
    ? digits.slice(2)
    : digits.startsWith('0')
      ? digits.slice(1)
      : digits;
  return withoutCountryCode.slice(0, MAX_LOCAL_PHONE_DIGITS);
};

export const normalizeIndonesianPhone = (value: string): string => {
  const localNumber = getIndonesianLocalPhone(value);
  return localNumber ? `+62${localNumber}` : '';
};

export const isValidIndonesianMobilePhone = (value: string): boolean =>
  /^8\d{8,11}$/.test(getIndonesianLocalPhone(value));

export const formatIndonesianLocalPhone = (value: string): string => {
  const digits = getIndonesianLocalPhone(value);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
};
