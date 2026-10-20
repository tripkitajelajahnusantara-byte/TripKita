// Rumus harga paket, sama dengan models/package_pricing.go di backend.
// PER_PERSON: harga x peserta. PER_UNIT: harga per unit (jeep/mobil/paket)
// berkapasitas unitCapacity orang; satu orang tetap membayar satu unit penuh.

export interface PackageAddOn {
  id: string;
  name: string;
  price: number;
  perPerson: boolean;
}

export interface BookingAddOn extends PackageAddOn {
  subtotal: number;
}

type PricedPackage = {
  price?: unknown;
  pricingMode?: unknown;
  unitName?: unknown;
  unitCapacity?: unknown;
  addOns?: unknown;
} | null | undefined;

export function isPerUnit(pkg: PricedPackage): boolean {
  return pkg?.pricingMode === 'PER_UNIT' && Number(pkg?.unitCapacity) > 0;
}

export function unitName(pkg: PricedPackage): string {
  return String(pkg?.unitName || '').trim() || 'Unit';
}

/** Jumlah unit yang dibutuhkan; 0 untuk harga per orang. */
export function unitsFor(pkg: PricedPackage, guests: number): number {
  if (!isPerUnit(pkg) || guests <= 0) return 0;
  return Math.ceil(guests / Number(pkg!.unitCapacity));
}

/** Harga trip sebelum add-on dan biaya layanan. */
export function basePrice(pkg: PricedPackage, guests: number): number {
  const price = Number(pkg?.price) || 0;
  const units = unitsFor(pkg, guests);
  return units > 0 ? units * price : Math.max(0, guests) * price;
}

/** Label satuan harga, mis. "/ orang" atau "/ Jeep". */
export function priceUnitLabel(pkg: PricedPackage): string {
  return isPerUnit(pkg) ? `/ ${unitName(pkg)}` : '/ orang';
}

export function packageAddOns(pkg: PricedPackage): PackageAddOn[] {
  if (!Array.isArray(pkg?.addOns)) return [];
  return pkg!.addOns
    .map((a: any) => ({ id: String(a?.id || ''), name: String(a?.name || '').trim(), price: Number(a?.price) || 0, perPerson: !!a?.perPerson }))
    .filter((a) => a.id && a.name && a.price > 0);
}

export function addOnSubtotal(addOn: PackageAddOn, guests: number): number {
  return addOn.perPerson ? addOn.price * Math.max(0, guests) : addOn.price;
}

/** Add-on terpilih dengan subtotal untuk jumlah peserta saat ini. */
export function selectAddOns(pkg: PricedPackage, ids: string[], guests: number): BookingAddOn[] {
  return packageAddOns(pkg)
    .filter((a) => ids.includes(a.id))
    .map((a) => ({ ...a, subtotal: addOnSubtotal(a, guests) }));
}

/** Add-on yang tersimpan pada booking (snapshot backend). */
export function bookingAddOns(booking: { addOns?: unknown } | null | undefined): BookingAddOn[] {
  if (!Array.isArray(booking?.addOns)) return [];
  return booking!.addOns
    .map((a: any) => ({ id: String(a?.id || ''), name: String(a?.name || '').trim(), price: Number(a?.price) || 0, perPerson: !!a?.perPerson, subtotal: Number(a?.subtotal) || 0 }))
    .filter((a) => a.name);
}
