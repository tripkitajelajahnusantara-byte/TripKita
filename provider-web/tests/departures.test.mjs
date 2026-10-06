import assert from 'node:assert/strict';
import test from 'node:test';
import { upcomingDepartures, weeklyDepartures } from '../src/utils/departures.ts';
import { isCustomerVisiblePackage } from '../src/utils/publicPackages.ts';

test('weekly schedules span three calendar months and preserve irregular dates', () => {
  const dates = weeklyDepartures('2026-10-06', '2026-12-31', [5]);
  assert.equal(dates.length, 12);
  assert.equal(dates[0], '2026-10-09');
  assert.equal(dates.at(-1), '2026-12-25');
  assert.deepEqual(weeklyDepartures('2026-12-31', '2026-10-01', [5]), []);
});
test('a later departure stays visible after the first departure passed', () => {
  const pkg = { status:'Aktif', tripType:'Open Trip', startDate:'2026-10-02', endDate:'2026-12-27', departureDates:['2026-10-02','2026-12-25'] };
  assert.equal(isCustomerVisiblePackage(pkg, '2026-11-01'), true);
  assert.equal(isCustomerVisiblePackage(pkg, '2026-12-28'), false);
  assert.deepEqual(upcomingDepartures(pkg,'2026-11-01'), []); // missing live counts fails closed
});
test('seats belong to each selected departure; legacy single departures still work', () => {
  const pkg = { departures: [{date:'2026-10-09',endDate:'2026-10-11',quotaUsed:15,seatsLeft:0},{date:'2026-11-06',endDate:'2026-11-08',quotaUsed:2,seatsLeft:13}] };
  assert.deepEqual(upcomingDepartures(pkg, '2026-10-06').map(d => d.seatsLeft), [0,13]);
  assert.equal(upcomingDepartures(pkg,'2026-10-12')[0].date, '2026-11-06');
  assert.equal(upcomingDepartures({startDate:'2026-10-31',duration:3,quotaMax:15,quotaUsed:2},'2026-10-06')[0].endDate,'2026-11-02');
});
