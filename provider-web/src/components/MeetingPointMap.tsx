import React, { useEffect } from 'react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MeetingPointCoordinates {
  lat: number;
  lng: number;
}

export const meetingPointPinIcon = L.divIcon({
  className: '',
  html: '<div aria-hidden="true" style="width:30px;height:30px;background:#0284c7;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 4px 12px rgba(15,23,42,.35);display:flex;align-items:center;justify-content:center"><span style="width:8px;height:8px;border-radius:50%;background:#fff;display:block"></span></div>',
  iconSize: [30, 42],
  iconAnchor: [15, 38],
});

export const isValidMeetingPointCoordinates = (lat: number, lng: number) =>
  Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

export const getMeetingPointCoordinates = (pkg: any): MeetingPointCoordinates | null => {
  const rawLat = pkg?.meetingPointLatitude;
  const rawLng = pkg?.meetingPointLongitude;
  if (rawLat !== null && rawLat !== undefined && rawLng !== null && rawLng !== undefined) {
    const lat = Number(rawLat);
    const lng = Number(rawLng);
    if (isValidMeetingPointCoordinates(lat, lng)) return { lat, lng };
  }

  // Kompatibilitas data lama yang pernah menyimpan koordinat di kolom teks.
  const legacy = String(pkg?.meetingPoint || '').trim();
  const match = legacy.match(/(?:lat\s*:\s*)?(-?\d+(?:\.\d+)?)\s*[,;]\s*(?:lng\s*:\s*)?(-?\d+(?:\.\d+)?)/i);
  if (!match) return null;
  const legacyLat = Number(match[1]);
  const legacyLng = Number(match[2]);
  return isValidMeetingPointCoordinates(legacyLat, legacyLng) ? { lat: legacyLat, lng: legacyLng } : null;
};

// Alamat teks titik kumpul untuk customer. Data lama yang menyimpan koordinat
// di kolom teks tidak dianggap alamat agar customer tidak melihat angka mentah.
export const getMeetingPointAddress = (pkg: any): string => {
  const address = String(pkg?.meetingPoint || '').trim();
  if (!address) return '';
  if (/^(?:lat\s*:\s*)?-?\d+(?:\.\d+)?\s*[,;]\s*(?:lng\s*:\s*)?-?\d+(?:\.\d+)?$/i.test(address)) return '';
  return address;
};

export const formatMeetingPointCoordinates = ({ lat, lng }: MeetingPointCoordinates) =>
  `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

export const MeetingPointMapViewport: React.FC<{
  position: MeetingPointCoordinates;
  zoom?: number;
}> = ({ position, zoom = 16 }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([position.lat, position.lng], zoom, { animate: false });
    window.setTimeout(() => map.invalidateSize(), 0);
  }, [map, position.lat, position.lng, zoom]);
  return null;
};

/** Area hasil pencarian; bounds berurutan [selatan, utara, barat, timur]. */
export interface MeetingPointMapFocus extends MeetingPointCoordinates {
  bounds?: [number, number, number, number];
}

// Mengarahkan peta ke hasil pencarian tanpa menaruh pin, sehingga pengguna
// tetap memilih titik kumpul persis sendiri.
export const MeetingPointMapFocusView: React.FC<{ focus: MeetingPointMapFocus | null }> = ({ focus }) => {
  const map = useMap();
  useEffect(() => {
    if (!focus) return;
    if (focus.bounds) {
      const [south, north, west, east] = focus.bounds;
      map.fitBounds([[south, west], [north, east]], { maxZoom: 18 });
    } else map.setView([focus.lat, focus.lng], 17);
  }, [map, focus]);
  return null;
};

export const MeetingPointMap: React.FC<{
  position: MeetingPointCoordinates;
  height?: number;
  zoom?: number;
}> = ({ position, height = 300, zoom = 16 }) => (
  <div style={{ borderRadius: '12px', overflow: 'hidden', height, border: '1px solid #cbd5e1' }}>
    <MapContainer
      center={[position.lat, position.lng]}
      zoom={zoom}
      scrollWheelZoom={false}
      style={{ height: '100%', width: '100%', zIndex: 1 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MeetingPointMapViewport position={position} zoom={zoom} />
      <Marker position={[position.lat, position.lng]} icon={meetingPointPinIcon} />
    </MapContainer>
  </div>
);

