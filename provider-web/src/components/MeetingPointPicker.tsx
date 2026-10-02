import { useRef, useState, useEffect } from 'react';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import { request } from '../utils/api';
import { parseMeetingPointInput, type Coordinates } from '../utils/meetingPointInput';
import { googleMapsConfigured, searchGooglePlaces, type PlaceResult } from '../utils/googleMaps';
import { GooglePointMap } from './GooglePointMap';
import { formatMeetingPointCoordinates, meetingPointPinIcon, MeetingPointMapFocusView, MeetingPointMapViewport, type MeetingPointMapFocus } from './MeetingPointMap';

type SearchResult = PlaceResult & Pick<MeetingPointMapFocus, 'bounds'>;
interface LocationSearch { matches: SearchResult[]; approximate: boolean; matchedQuery: string }
interface GeocodeItem { displayName?: string; latitude?: number; longitude?: number; boundingBox?: unknown }

const validBounds = (value: unknown): SearchResult['bounds'] =>
  Array.isArray(value) && value.length === 4 && value.every(Number.isFinite) ? value as SearchResult['bounds'] : undefined;

// Backend melonggarkan alamat bila tempat persisnya belum ada di OpenStreetMap
// (mis. nama cabang toko) dan menandai hasilnya sebagai perkiraan wilayah.
async function searchOpenStreetMap(query: string): Promise<LocationSearch> {
  const response = await request(`/provider/geocode?q=${encodeURIComponent(query)}`);
  const items: GeocodeItem[] = Array.isArray(response.results) && response.results.length ? response.results : [response];
  const matches = items.flatMap((item, index) => {
    const point = parseMeetingPointInput(`${item.latitude},${item.longitude}`);
    return point ? [{ id: `osm-${index}`, name: item.displayName || query, address: '', ...point, bounds: validBounds(item.boundingBox) }] : [];
  });
  if (!matches.length) throw new Error('Koordinat hasil pencarian tidak valid.');
  return { matches, approximate: Boolean(response.approximate), matchedQuery: String(response.matchedQuery || '') };
}

function Pin({ position, onSelect }: { position: Coordinates | null; onSelect: (point: Coordinates) => void }) {
  useMapEvents({ click: event => onSelect(event.latlng) });
  return position && <Marker position={[position.lat, position.lng]} icon={meetingPointPinIcon} draggable eventHandlers={{ dragend: event => onSelect(event.target.getLatLng()) }} />;
}

export function MeetingPointPicker({ address, position, onAddressChange, onSelect }: {
  address: string; position: Coordinates | null;
  onAddressChange: (address: string) => void; onSelect: (point: Coordinates | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [approximate, setApproximate] = useState(false);
  const [matchedQuery, setMatchedQuery] = useState('');
  const [focus, setFocus] = useState<MeetingPointMapFocus | null>(null);
  const [coordinateInput, setCoordinateInput] = useState('');
  const version = useRef(0);
  useEffect(() => () => { version.current++; }, []);
  const select = (point: Coordinates) => { version.current++; setBusy(false); setResults([]); setError(''); onSelect({ lat: point.lat, lng: point.lng }); };
  const search = async () => {
    if (busy) return;
    if (address.trim().length < 3) { setError('Masukkan nama tempat beserta kota atau alamat lengkap.'); return; }
    const current = ++version.current;
    setBusy(true); setError(''); setResults([]); onSelect(null);
    try {
      // The destination province may differ from the meeting point's city.
      // Never silently append that province to the user's search.
      let found: LocationSearch;
      if (googleMapsConfigured) {
        const matches = await searchGooglePlaces(address.trim());
        // Bila Google tidak menemukan tempatnya, peta tetap diarahkan ke perkiraan wilayah.
        found = matches.length ? { matches, approximate: false, matchedQuery: '' } : await searchOpenStreetMap(address.trim());
      } else found = await searchOpenStreetMap(address.trim());
      if (current !== version.current) return;
      const [best] = found.matches;
      setResults(found.matches); setApproximate(found.approximate); setMatchedQuery(found.matchedQuery);
      setFocus({ lat: best.lat, lng: best.lng, bounds: best.bounds });
    } catch (err) {
      if (current === version.current) setError(err instanceof Error ? err.message : 'Pencarian lokasi gagal.');
    } finally { if (current === version.current) setBusy(false); }
  };
  return <div>
    <p style={{ fontSize: 13, color: '#64748b' }}>Cari nama tempat dan kota, lalu pilih hasil yang sesuai. Klik peta atau geser pin untuk menentukan titik kumpul persis.</p>
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      <input aria-label="Alamat titik kumpul" value={address} maxLength={255} placeholder="Contoh: Margo City, Jalan Margonda, Depok" style={{ flex: '1 1 250px' }}
        onChange={event => { version.current++; setBusy(false); setResults([]); setError(''); onAddressChange(event.target.value); onSelect(null); }}
        onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void search(); } }} />
      <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void search()}>{busy ? 'Mencari…' : 'Cari Lokasi'}</button>
    </div>
    {results.length > 0 && <div aria-label="Hasil pencarian lokasi" style={{ marginTop: 10 }}>
      {approximate && <p role="status" style={{ fontSize: 13, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 10 }}>
        Lokasi persis belum tercatat di peta. Peta diarahkan ke wilayah terdekat{matchedQuery && <> untuk “{matchedQuery}”</>}. Klik peta atau geser pin tepat di titik kumpul.
      </p>}
      <p>{approximate ? 'Perkiraan wilayah:' : 'Pilih lokasi yang tepat:'}</p>
      {/* Perkiraan wilayah tidak menimpa alamat yang diketik karena alamat itu lebih spesifik. */}
      {results.map(result => <button type="button" key={result.id} onClick={() => { if (!approximate) onAddressChange([result.name, result.address].filter(Boolean).join(', ').slice(0, 255)); select(result); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: 12, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, marginBottom: 6, cursor: 'pointer' }}>
        <strong>{result.name}</strong>{result.address && <div>{result.address}</div>}
      </button>)}
      <small>{googleMapsConfigured ? 'Hasil dari Google Maps' : 'Hasil dari OpenStreetMap'}</small>
    </div>}
    <p style={{ fontSize: 13 }}><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || 'Indonesia')}`} target="_blank" rel="noopener noreferrer">Cari alamat di Google Maps ↗</a></p>
    <label htmlFor="meeting-point-coordinate">Koordinat atau tautan pin Google Maps</label>
    <p style={{ fontSize: 12, color: '#64748b' }}>Untuk titik persis, klik kanan lokasi di Google Maps lalu salin koordinatnya. Tautan pendek perlu dibuka dahulu.</p>
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
      <input id="meeting-point-coordinate" value={coordinateInput} onChange={event => setCoordinateInput(event.target.value)} placeholder="-6.372900, 106.834600" style={{ flex: '1 1 250px' }} />
      <button type="button" className="btn btn-primary" onClick={() => {
        const point = parseMeetingPointInput(coordinateInput);
        if (point) select(point);
        else setError('Salin koordinat latitude, longitude atau tautan lengkap pin Google Maps. Tautan pendek dan posisi kamera (@) tidak menentukan pin.');
      }}>Gunakan Titik</button>
    </div>
    {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
    <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
      {googleMapsConfigured ? <GooglePointMap position={position} focus={focus} onSelect={select} /> : <MapContainer center={position ? [position.lat, position.lng] : [-2.5, 118]} zoom={position ? 18 : 4} style={{ height: 300, zIndex: 1 }}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MeetingPointMapFocusView focus={focus} />
        {position && <MeetingPointMapViewport position={position} zoom={18} />}
        <Pin position={position} onSelect={select} />
      </MapContainer>}
    </div>
    <p style={{ fontSize: 12 }}>Koordinat: <strong>{position ? formatMeetingPointCoordinates(position) : 'belum dipilih'}</strong>
      {position && <> · <a href={`https://www.google.com/maps/search/?api=1&query=${position.lat},${position.lng}`} target="_blank" rel="noopener noreferrer">Periksa pin di Google Maps ↗</a></>}
    </p>
  </div>;
}
