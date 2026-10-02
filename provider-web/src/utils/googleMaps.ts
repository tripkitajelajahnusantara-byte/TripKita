/// <reference types="google.maps" />
export const googleMapsConfigured = Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim());
let mapsPromise: Promise<void> | undefined;

export function loadGoogleMaps(): Promise<void> {
  if (!googleMapsConfigured) return Promise.reject(new Error('Pencarian Google Maps belum tersedia. Gunakan koordinat dari pin Google Maps.'));
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    const globals = window as typeof window & { temenTripMapsReady?: () => void };
    const timer = window.setTimeout(() => fail(), 15000);
    function fail() {
      window.clearTimeout(timer);
      script.remove();
      delete globals.temenTripMapsReady;
      mapsPromise = undefined;
      reject(new Error('Google Maps gagal dimuat. Coba lagi atau gunakan koordinat dari pin Google Maps.'));
    }
    globals.temenTripMapsReady = () => {
      window.clearTimeout(timer);
      delete globals.temenTripMapsReady;
      resolve();
    };
    const params = new URLSearchParams({ key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY, v: 'weekly', loading: 'async', language: 'id', region: 'ID', callback: 'temenTripMapsReady' });
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return mapsPromise;
}

export interface PlaceResult { id: string; name: string; address: string; lat: number; lng: number }
export async function searchGooglePlaces(textQuery: string): Promise<PlaceResult[]> {
  await loadGoogleMaps();
  const { Place } = await google.maps.importLibrary('places') as google.maps.PlacesLibrary;
  const { places } = await Place.searchByText({ textQuery, fields: ['id', 'displayName', 'formattedAddress', 'location'], language: 'id', region: 'id', maxResultCount: 5 });
  return places.filter(p => p.location).map(p => ({ id: p.id, name: p.displayName ?? '', address: p.formattedAddress ?? '', lat: p.location!.lat(), lng: p.location!.lng() }));
}
