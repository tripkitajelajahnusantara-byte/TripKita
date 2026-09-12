import { getTripImage } from './tripImages';
import { request, getCustomerToken } from './api';

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
      const resolvedImg = getTripImage(
        pkgId,
        pkg.name || '',
        pkg.category || '',
        pkg.image || pkg.images || pkg.imageUrl
      );

      const wishItem: WishlistItem = {
        id: pkgId,
        name: pkg.name || 'Paket TripKita',
        destination: pkg.destination || 'Indonesia',
        category: pkg.category || 'Wisata',
        tripType: pkg.tripType || 'Open Trip',
        price: pkg.price || 0,
        rating: pkg.rating || 4.8,
        image: resolvedImg,
        schedule: pkg.schedule,
        quotaMin: pkg.quotaMin,
        quotaMax: pkg.quotaMax
      };
      updated = [wishItem, ...list];
    }

    localStorage.setItem('tripkita_customer_wishlist', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('tripkita_wishlist_updated', { detail: updated }));

    // Sync wishlist to database if logged in as customer
    const token = getCustomerToken();
    if (token) {
      request('/provider/profile', {
        method: 'PUT',
        body: JSON.stringify({ wishlistData: JSON.stringify(updated) })
      }).catch((err) => console.log('Wishlist DB sync skipped:', err));
    }

    return updated;
  } catch (e) {
    console.error('Error updating wishlist storage:', e);
    return [];
  }
};
