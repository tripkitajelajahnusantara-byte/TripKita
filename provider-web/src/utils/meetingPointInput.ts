export interface Coordinates { lat: number; lng: number }

const pair = /^\s*(-?\d+(?:\.\d+)?)\s*[,;]\s*(-?\d+(?:\.\d+)?)\s*$/;
const valid = (lat: number, lng: number) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

/** Only an actual place pin/query is accepted. /@lat,lng is a camera centre. */
export function parseMeetingPointInput(input: string): Coordinates | null {
  let match = input.match(pair);
  if (!match) {
    try {
      const url = new URL(input.trim());
      if (url.protocol !== 'https:' || !/^(?:www\.|maps\.)?google\.(?:com|co\.id)$/.test(url.hostname)) return null;
      const pin = decodeURIComponent(url.pathname + url.search).match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
      match = pin ?? (url.searchParams.get('query') ?? url.searchParams.get('q') ?? url.searchParams.get('destination') ?? '').match(pair);
    } catch { return null; }
  }
  if (!match) return null;
  const lat = Number(match[1]), lng = Number(match[2]);
  return valid(lat, lng) ? { lat, lng } : null;
}
