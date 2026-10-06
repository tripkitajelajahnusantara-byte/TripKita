-- Run before deploying the API. Existing packages keep their meeting point
-- and single departure. Private pickup addresses remain on booking participants.
BEGIN;
ALTER TABLE packages
    ADD COLUMN IF NOT EXISTS pickup_mode VARCHAR(20) NOT NULL DEFAULT 'MEETING_POINT',
    ADD COLUMN IF NOT EXISTS pickup_area VARCHAR(500) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS pickup_notes VARCHAR(1000) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS pickup_points TEXT,
    ADD COLUMN IF NOT EXISTS departure_dates TEXT;
ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS pickup_mode VARCHAR(20) NOT NULL DEFAULT 'MEETING_POINT',
    ADD COLUMN IF NOT EXISTS pickup_instructions TEXT;
ALTER TABLE booking_participants
    ADD COLUMN IF NOT EXISTS pickup_point VARCHAR(500) NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_bookings_package_trip_status ON bookings(package_id, trip_date, status);
COMMIT;
