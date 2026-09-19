-- Migrasi 006: simpan waktu selesai perjalanan pada setiap booking.
--
-- Kolom ini menjadi sumber kebenaran untuk penyelesaian booking dan pelepasan
-- pelunasan 50%. Aman dijalankan sebelum backend baru dideploy karena backend
-- lama akan mengabaikan kolom tambahan.

BEGIN;

ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS trip_end_date TIMESTAMPTZ;

UPDATE bookings AS b
SET trip_end_date = b.trip_date
    + make_interval(days => GREATEST(COALESCE(p.duration, 1), 1)::integer)
FROM packages AS p
WHERE p.id = b.package_id
  AND b.trip_end_date IS NULL;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM bookings WHERE trip_end_date IS NULL) THEN
        RAISE EXCEPTION 'Migrasi dihentikan: terdapat booking tanpa paket/durasi sehingga trip_end_date tidak dapat dihitung';
    END IF;
END $$;

ALTER TABLE bookings
    ALTER COLUMN trip_end_date SET NOT NULL;

UPDATE held_settlements AS hs
SET release_date = b.trip_end_date
FROM bookings AS b
WHERE b.id = hs.booking_id
  AND hs.status = 'HELD'
  AND hs.release_date IS DISTINCT FROM b.trip_end_date;

CREATE INDEX IF NOT EXISTS ix_bookings_status_trip_end_date
    ON bookings (status, trip_end_date);

COMMIT;
