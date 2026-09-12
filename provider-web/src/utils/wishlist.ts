export interface WishlistItem {
  id: number;
  name: string;
  destination: string;
  category: string;
  tripType: string;
  price: number;
  rating?: number;
  image?: string;
  schedule?: string;
  quotaMin?: number;
  quotaMax?: number;
}

export const getWishlistStorage = (): WishlistItem[] => {
  try {
    const raw = localStorage.getItem('tripkita_customer_wishlist');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading wishlist storage:', e);
    return [];
  }
};

export const isInWishlist = (pkgId: number): boolean => {
  const list = getWishlistStorage();
  return list.some(item => Number(item.id) === Number(pkgId));
};

export const toggleWishlistStorage = (pkg: any): WishlistItem[] => {
  try {
    const list = getWishlistStorage();
    const pkgId = Number(pkg.id);
    const exists = list.some(item => Number(item.id) === pkgId);

    let updated: WishlistItem[];
    if (exists) {
      updated = list.filter(item => Number(item.id) !== pkgId);
    } else {
      const wishItem: WishlistItem = {
        id: pkgId,
        name: pkg.name || 'Paket TripKita',
        destination: pkg.destination || 'Indonesia',
        category: pkg.category || 'Wisata',
        tripType: pkg.tripType || 'Open Trip',
        price: pkg.price || 0,
        rating: pkg.rating || 4.8,
        image: pkg.image || pkg.imageUrl,
        schedule: pkg.schedule,
        quotaMin: pkg.quotaMin,
        quotaMax: pkg.quotaMax
      };
      updated = [wishItem, ...list];
    }

    localStorage.setItem('tripkita_customer_wishlist', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('tripkita_wishlist_updated', { detail: updated }));
    return updated;
  } catch (e) {
    console.error('Error updating wishlist storage:', e);
    return [];
  }
};
