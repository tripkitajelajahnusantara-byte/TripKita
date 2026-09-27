-- Snapshot prakiraan cuaca H-3 untuk trip selain Open Trip.
-- Menggunakan tabel trip_departures agar keputusan lanjut/reschedule/batal tetap
-- berada dalam satu jalur audit, refund, dan persetujuan pelanggan yang sama.

ALTER TABLE trip_departures ADD COLUMN IF NOT EXISTS weather_location VARCHAR(255);
ALTER TABLE trip_departures ADD COLUMN IF NOT EXISTS weather_condition VARCHAR(255);
ALTER TABLE trip_departures ADD COLUMN IF NOT EXISTS weather_min_temp_c DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE trip_departures ADD COLUMN IF NOT EXISTS weather_max_temp_c DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE trip_departures ADD COLUMN IF NOT EXISTS weather_rain_chance INTEGER NOT NULL DEFAULT 0;
ALTER TABLE trip_departures ADD COLUMN IF NOT EXISTS weather_precip_mm DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE trip_departures ADD COLUMN IF NOT EXISTS weather_max_wind_kph DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE trip_departures ADD COLUMN IF NOT EXISTS weather_is_adverse BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE trip_departures ADD COLUMN IF NOT EXISTS weather_advisory TEXT;
ALTER TABLE trip_departures ADD COLUMN IF NOT EXISTS weather_forecasted_at TIMESTAMPTZ;

ALTER TABLE trip_departures ENABLE ROW LEVEL SECURITY;
