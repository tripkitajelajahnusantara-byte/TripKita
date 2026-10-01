import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '../utils/googleMaps';
import type { Coordinates } from '../utils/meetingPointInput';
import type { MeetingPointMapFocus } from './MeetingPointMap';

function showFocus(map: google.maps.Map, focus: MeetingPointMapFocus) {
  if (!focus.bounds) { map.setCenter(focus); map.setZoom(17); return; }
  const [south, north, west, east] = focus.bounds;
  map.fitBounds({ south, north, west, east });
  google.maps.event.addListenerOnce(map, 'idle', () => { if ((map.getZoom() ?? 0) > 18) map.setZoom(18); });
}

export function GooglePointMap({ position, focus = null, onSelect }: { position: Coordinates | null; focus?: MeetingPointMapFocus | null; onSelect: (point: Coordinates) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const marker = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const selection = useRef({ position, focus, onSelect });
  const [error, setError] = useState('');
  useEffect(() => { selection.current = { position, focus, onSelect }; }, [position, focus, onSelect]);
  useEffect(() => {
    let cancelled = false;
    const listeners: google.maps.MapsEventListener[] = [];
    void (async () => {
      try {
        await loadGoogleMaps();
        const { Map } = await google.maps.importLibrary('maps') as google.maps.MapsLibrary;
        const { AdvancedMarkerElement } = await google.maps.importLibrary('marker') as google.maps.MarkerLibrary;
        if (cancelled || !container.current) return;
        const point = selection.current.position;
        map.current = new Map(container.current, { center: point ?? { lat: -2.5, lng: 118 }, zoom: point ? 18 : 4, mapId: import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID', streetViewControl: false, mapTypeControl: true });
        if (!point && selection.current.focus) showFocus(map.current, selection.current.focus);
        marker.current = new AdvancedMarkerElement({ map: map.current, position: point, gmpDraggable: true, title: 'Titik kumpul' });
        listeners.push(map.current.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (event.latLng) selection.current.onSelect(event.latLng.toJSON());
        }));
        listeners.push(marker.current.addListener('dragend', (event: google.maps.MapMouseEvent) => {
          if (event.latLng) selection.current.onSelect(event.latLng.toJSON());
        }));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Peta tidak dapat dimuat.');
      }
    })();
    return () => {
      cancelled = true;
      listeners.forEach(listener => listener.remove());
      if (marker.current) marker.current.map = null;
      marker.current = null;
      map.current = null;
    };
  }, []);
  useEffect(() => {
    if (marker.current) marker.current.position = position;
    if (map.current && position) { map.current.setCenter(position); map.current.setZoom(18); }
  }, [position]);
  useEffect(() => {
    if (map.current && focus) showFocus(map.current, focus);
  }, [focus]);
  return <div style={{ height: 300, position: 'relative' }}>
    <div ref={container} style={{ height: '100%' }} aria-label="Pilih titik kumpul di Google Maps" />
    {error && <p role="alert" style={{ position: 'absolute', inset: 10, background: '#fff', padding: 16 }}>{error}</p>}
  </div>;
}
