import assert from 'node:assert/strict';
import test from 'node:test';
import { parseMeetingPointInput } from '../src/utils/meetingPointInput.ts';

test('coordinates preserve the exact pin, including a Google Maps query', () => {
  for (const input of ['-6.3729,106.8346', 'https://www.google.com/maps/search/?api=1&query=-6.3729%2C106.8346', 'https://www.google.com/maps/place/Margo/@-6,106,15z/data=!3d-6.3729!4d106.8346']) {
    assert.deepEqual(parseMeetingPointInput(input), { lat: -6.3729, lng: 106.8346 });
  }
});
test('camera centres, short links, foreign hosts and invalid coordinates are never mistaken for a pin', () => {
  for (const input of ['https://www.google.com/maps/@-6.3729,106.8346,15z', 'https://maps.app.goo.gl/abc', 'https://evil.example/?q=-6,106', '91,106', '-6,181', 'NaN,106', '', 'Jalan Margonda No.426']) {
    assert.equal(parseMeetingPointInput(input), null, input);
  }
});
