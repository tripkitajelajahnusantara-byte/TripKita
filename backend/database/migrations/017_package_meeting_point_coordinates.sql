-- Koordinat menjadi sumber posisi marker titik kumpul. Kolom teks lama tetap
-- dipertahankan untuk kompatibilitas email/PDF dan paket yang sudah ada.
ALTER TABLE packages
    ADD COLUMN IF NOT EXISTS meeting_point_latitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS meeting_point_longitude DOUBLE PRECISION;

ALTER TABLE packages DROP CONSTRAINT IF EXISTS packages_meeting_point_coordinates_check;
ALTER TABLE packages
    ADD CONSTRAINT packages_meeting_point_coordinates_check CHECK (
        (meeting_point_latitude IS NULL AND meeting_point_longitude IS NULL)
        OR (
            meeting_point_latitude BETWEEN -90 AND 90
            AND meeting_point_longitude BETWEEN -180 AND 180
        )
    );
