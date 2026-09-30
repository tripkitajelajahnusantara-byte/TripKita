import assert from 'node:assert/strict';
import test from 'node:test';
import { addDays, bookingTimestamp, dateRange, jakartaToday, rangeAvailable, threeMonthLimit, tripEndDate, validDate } from '../src/utils/tripDates.ts';

test('calendar boundaries clamp month ends and use Jakarta rather than UTC/device dates', () => {
  assert.equal(threeMonthLimit('2026-11-30'), '2027-02-28');
  assert.equal(threeMonthLimit('2027-11-30'), '2028-02-29');
  assert.equal(jakartaToday(new Date('2026-09-30T17:30:00Z')), '2026-10-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(validDate('2026-02-30'), false);
});
test('customer can only select complete provider-open ranges, and empty availability closes all dates', () => {
  const dates = dateRange('2026-10-07', '2026-10-12');
  const valid = (start, available = dates, booked = []) => rangeAvailable(start, tripEndDate(start, 3), '2026-10-07', '2026-10-12', available, booked);
  assert.equal(valid('2026-10-07'), true);
  assert.equal(valid('2026-10-10'), true);
  assert.equal(valid('2026-10-11'), false);
  assert.equal(valid('2026-10-07', []), false);
  assert.equal(valid('2026-10-07', dates.filter(d => d !== '2026-10-08')), false);
  assert.equal(valid('2026-10-07', dates, ['2026-10-08']), false);
  assert.equal(valid('2026-10-06'), false);
});
test('one-day and cross-month trips retain exact dates all the way to checkout', () => {
  assert.equal(tripEndDate('2026-10-07', 1), '2026-10-07');
  assert.equal(tripEndDate('2026-10-31', 3), '2026-11-02');
  assert.equal(bookingTimestamp('2026-10-07'), '2026-10-07T08:00:00+07:00');
  assert.equal(new Date(bookingTimestamp('2026-10-07')).toISOString(), '2026-10-07T01:00:00.000Z');
  assert.throws(() => bookingTimestamp('7 Oktober 2026 - 9 Oktober 2026'));
  assert.deepEqual(dateRange('2026-10-10', '2026-10-07'), []);
});
