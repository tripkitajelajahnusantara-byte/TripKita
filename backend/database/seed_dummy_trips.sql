-- ============================================================================
-- SEED DATA UJI: 10 trip dummy untuk tes booking dari web & mobile (STAGING).
--
-- Isi:
--   * 5 akun mitra QA (APPROVED + terverifikasi) dan 1 akun customer QA.
--   * 6 Open Trip berjadwal rutin sampai ±12 bulan ke depan (maks. 100 tanggal
--     per paket, aturan backend), kuota dihitung per keberangkatan.
--   * 4 paket eksklusif (Private Trip, Honeymoon, Family, Corporate), tiap paket
--     milik mitra berbeda karena satu mitra hanya boleh punya satu trip
--     eksklusif per hari. Semua tanggal H+7 s.d. batas 3 bulan dibuka.
--   * Variasi untuk QA: titik jemput fleksibel, harga per unit (Jeep), add-on,
--     batas usia, minimal peserta, kuota menipis, dan koordinat titik kumpul
--     (urutan "Lokasi Terdekat" di Cari Trip mobile).
--
-- Aman dijalankan ulang (idempotent): akun & paket diperbarui berdasarkan email
-- dan nama paket. Jalankan ulang tiap beberapa minggu untuk menggeser jadwal ke
-- depan; tanggal yang sudah dipesan tidak dihapus.
--
-- Seluruh seed adalah SATU blok DO (atomik) tanpa tabel sementara, sehingga
-- bisa dijalankan di SQL Editor Supabase yang tidak menyimpan state antar
-- statement.
--
-- Cara pakai (psql / Supabase SQL Editor / Railway Query):
--   psql "$DATABASE_URL" -f backend/database/seed_dummy_trips.sql
--
-- JANGAN dijalankan di database production: akun memakai domain .test dan
-- password yang tertulis di bawah.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
    -- Password seluruh akun QA (minimal 12 karakter).
    v_password    TEXT := 'QaTemenTrip2026!';
    v_hash        TEXT := crypt(v_password, gen_salt('bf', 12));
    -- Tanggal WIB, sama dengan models.BookingLocation backend.
    v_today       DATE := (NOW() AT TIME ZONE 'Asia/Jakarta')::date;
    -- Batas buka tanggal paket eksklusif: 3 bulan (models.AvailabilityWindow).
    v_horizon     DATE := ((NOW() AT TIME ZONE 'Asia/Jakarta')::date + INTERVAL '3 months')::date;
    v_provider_id BIGINT;
    v_package_id  BIGINT;
    v_departures  TEXT;
    v_start       TEXT;
    v_end         TEXT;
    v_schedule    TEXT;
    a             RECORD;
    t             RECORD;
BEGIN
    -- -----------------------------------------------------------------------
    -- 1. Akun mitra & customer QA
    -- -----------------------------------------------------------------------
    FOR a IN SELECT * FROM (VALUES
    ('qa-opentrip@tementrip.test',  'PROVIDER', 'QA Nusantara Open Trip',  'Tour & Travel', 'DKI Jakarta',        'Jakarta Selatan', 'Andi QA',   '081200000001', 'Mitra uji untuk seluruh Open Trip dummy.'),
    ('qa-bromo@tementrip.test',     'PROVIDER', 'QA Bromo Jeep Adventure', 'Tour & Travel', 'Jawa Timur',         'Probolinggo',     'Budi QA',   '081200000002', 'Mitra uji paket Private Trip Jeep Bromo.'),
    ('qa-honeymoon@tementrip.test', 'PROVIDER', 'QA Bali Honeymoon',       'Tour & Travel', 'Bali',               'Denpasar',        'Citra QA',  '081200000003', 'Mitra uji paket Honeymoon.'),
    ('qa-family@tementrip.test',    'PROVIDER', 'QA Jogja Family Trip',    'Tour & Travel', 'DI Yogyakarta',      'Yogyakarta',      'Dewi QA',   '081200000004', 'Mitra uji paket Family Trip.'),
    ('qa-corporate@tementrip.test', 'PROVIDER', 'QA Bandung Corporate',    'Tour & Travel', 'Jawa Barat',         'Bandung',         'Eko QA',    '081200000005', 'Mitra uji paket Corporate Outing.'),
    ('qa-customer@tementrip.test',  'CUSTOMER', 'Customer QA',             'customer',      'Indonesia',          'Indonesia',       'Customer QA','081200000099', 'Akun customer untuk uji booking.')
    ) AS x(email, role, business, category, province, city, pic_name, whatsapp, about)
    LOOP
        SELECT id INTO v_provider_id FROM providers WHERE lower(email) = a.email ORDER BY id LIMIT 1;

        IF v_provider_id IS NULL THEN
            INSERT INTO providers (
                business_name, business_category, operational_province, operational_city, description,
                document_uploaded, pic_name, email, password_hash, whats_app, is_verified, role, status,
                verification_notes, bank_name, bank_account, bank_account_name, gender, birth_date,
                created_at, updated_at
            ) VALUES (
                a.business, a.category, a.province, a.city, a.about,
                TRUE, a.pic_name, a.email, v_hash, a.whatsapp, TRUE, a.role, 'APPROVED',
                'Akun QA dari seed_dummy_trips.sql', 'BCA', '1234567890', a.pic_name,
                CASE WHEN a.role = 'CUSTOMER' THEN 'Laki-laki' ELSE '' END,
                CASE WHEN a.role = 'CUSTOMER' THEN '1995-04-12' ELSE '' END,
                NOW(), NOW()
            )
            RETURNING id INTO v_provider_id;
        ELSE
            UPDATE providers
            SET business_name = a.business, business_category = a.category,
                operational_province = a.province, operational_city = a.city, description = a.about,
                pic_name = a.pic_name, password_hash = v_hash, whats_app = a.whatsapp,
                is_verified = TRUE, role = a.role, status = 'APPROVED', deleted_at = NULL,
                updated_at = NOW()
            WHERE id = v_provider_id;
        END IF;

        INSERT INTO users (provider_id, email, password_hash, failed_login_attempts, locked_until,
                           password_changed_at, created_at, updated_at)
        VALUES (v_provider_id, a.email, v_hash, 0, NULL, NOW(), NOW(), NOW())
        ON CONFLICT (provider_id) DO UPDATE
        SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash,
            failed_login_attempts = 0, locked_until = NULL, updated_at = NOW();
    END LOOP;

    -- -----------------------------------------------------------------------
    -- 2. 10 trip. weekdays = hari keberangkatan Open Trip (ISO: 1=Senin ...
    --    7=Minggu); NULL untuk paket eksklusif yang memakai package_dates.
    -- -----------------------------------------------------------------------
    FOR t IN SELECT * FROM (VALUES
    -- 1. Open Trip, penjemputan fleksibel Jabodetabek, berangkat tiap Jumat.
    ('qa-opentrip@tementrip.test',
     'Open Trip Gunung Prau 2.590mdpl via Patak Banteng (Jabodetabek)', 'Jawa Tengah',
     '["Wonosobo","Patak Banteng","Puncak Gunung Prau"]',
     'Jakarta, RS UKI Cawang', -6.2431, 106.8752,
     'FLEXIBLE', 'Jabodetabek, searah Jakarta–Cikampek', 'Jam jemput dikonfirmasi via WhatsApp H-1.',
     '["Jakarta, RS UKI Cawang","Depok, Exit Tol Cisalak","Bekasi, Hotel Amarossa"]',
     'Gunung', 'Open Trip', 775000, 'PER_PERSON', '', 0, '[]',
     5, 20, 3, 1, 20, 17, 65, 4.6, ARRAY[5],
     'Open Trip Gunung Prau 2.590 MDPL via Patak Banteng, Wonosobo. Nikmati golden sunrise dengan latar Sindoro-Sumbing, camping di sabana puncak, dan perjalanan santai bersama teman baru.',
     E'Transportasi PP Full AC\nDriver\nBBM & Toll\nTenda & alat masak\nMakan 3x\nTour Guide',
     E'Perlengkapan pribadi\nAir & cemilan pribadi\nTips crew sukarela',
     '[{"day":1,"activities":[{"time":"19:00 - 21:00","title":"Berkumpul di titik jemput"},{"time":"21:00","title":"Perjalanan menuju basecamp Patak Banteng"}]},{"day":2,"activities":[{"time":"08:00 - 10:00","title":"Tiba di basecamp Patak Banteng"},{"time":"11:00 - 15:00","title":"Pendakian menuju area camp"},{"time":"16:00","title":"Sunset dan camping di puncak"}]},{"day":3,"activities":[{"time":"04:30","title":"Sunrise puncak Gunung Prau"},{"time":"09:00","title":"Turun ke basecamp"},{"time":"13:00","title":"Perjalanan pulang ke Jabodetabek"}]}]',
     'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=1200&q=80,https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80,https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80'),

    -- 2. Open Trip murah, titik kumpul stasiun, tiap Sabtu, add-on per orang.
    ('qa-opentrip@tementrip.test',
     'Open Trip Bromo Midnight Sunrise', 'Jawa Timur',
     '["Penanjakan","Kawah Bromo","Pasir Berbisik","Bukit Teletubbies"]',
     'Stasiun Malang Kota Baru', -7.9772, 112.6370,
     'MEETING_POINT', '', '', '[]',
     'Gunung', 'Open Trip', 350000, 'PER_PERSON', '', 0,
     '[{"id":"jaket","name":"Sewa jaket gunung","price":25000,"perPerson":true},{"id":"kuda","name":"Sewa kuda ke kawah","price":150000,"perPerson":false}]',
     4, 15, 2, 1, 15, 5, 70, 4.8, ARRAY[6],
     'Berangkat tengah malam dari Malang menuju Penanjakan untuk sunrise Bromo, lalu jeep ke kawah, pasir berbisik, dan bukit teletubbies.',
     E'Jeep 4x4 PP\nTiket masuk TNBTS\nDriver & Guide\nAir mineral',
     E'Makan\nSewa kuda\nPengeluaran pribadi',
     '[{"day":1,"activities":[{"time":"23:30","title":"Berkumpul di Stasiun Malang Kota Baru"}]},{"day":2,"activities":[{"time":"03:30","title":"Sunrise di Penanjakan"},{"time":"06:30","title":"Kawah Bromo"},{"time":"08:30","title":"Pasir Berbisik & Bukit Teletubbies"},{"time":"12:00","title":"Kembali ke Malang"}]}]',
     'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80,https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=1200&q=80'),

    -- 3. Open Trip pulau, berangkat Rabu & Sabtu (jadwal paling rapat).
    ('qa-opentrip@tementrip.test',
     'Open Trip Pulau Pari 2D1N', 'DKI Jakarta',
     '["Pulau Pari","Pantai Pasir Perawan","Pulau Tikus"]',
     'Dermaga Kali Adem, Muara Angke', -6.1066, 106.7760,
     'MEETING_POINT', '', '', '[]',
     'Pantai', 'Open Trip', 450000, 'PER_PERSON', '', 0,
     '[{"id":"snorkel","name":"Alat snorkeling & dokumentasi","price":50000,"perPerson":true}]',
     6, 30, 2, 1, 30, 0, 100, 4.5, ARRAY[3,6],
     'Liburan singkat ke Pulau Pari: snorkeling di Pulau Tikus, sunset di Pantai Pasir Perawan, dan BBQ malam di homestay tepi pantai.',
     E'Kapal PP Muara Angke\nHomestay AC\nMakan 3x + BBQ\nSewa sepeda\nGuide lokal',
     E'Tiket parkir kendaraan\nPengeluaran pribadi',
     '[{"day":1,"activities":[{"time":"06:00","title":"Berkumpul di Dermaga Kali Adem"},{"time":"10:00","title":"Check-in homestay Pulau Pari"},{"time":"13:00","title":"Snorkeling Pulau Tikus"},{"time":"17:00","title":"Sunset Pantai Pasir Perawan"}]},{"day":2,"activities":[{"time":"07:00","title":"Bersepeda keliling pulau"},{"time":"13:00","title":"Kembali ke Jakarta"}]}]',
     'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80,https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80'),

    -- 4. Open Trip tanpa rating (badge "Baru"), tiap Kamis.
    ('qa-opentrip@tementrip.test',
     'Open Trip Belitung Laskar Pelangi 3D2N', 'Bangka Belitung',
     '["Pantai Tanjung Tinggi","Pulau Lengkuas","Replika Sekolah Laskar Pelangi"]',
     'Bandara H.A.S. Hanandjoeddin', -2.7456, 107.7546,
     'MEETING_POINT', '', '', '[]',
     'City Tour', 'Open Trip', 999000, 'PER_PERSON', '', 0, '[]',
     6, 20, 3, 1, 20, 0, 100, 0, ARRAY[4],
     'Jelajah Belitung: island hopping Pulau Lengkuas, Pantai Tanjung Tinggi, dan Replika Sekolah Laskar Pelangi.',
     E'Transportasi Full AC\nDriver\nTour Guide\nHotel 2 malam\nKapal island hopping',
     E'Tiket pesawat\nMakan malam',
     '[{"day":1,"activities":[{"time":"10:00","title":"Penjemputan di bandara"},{"time":"13:00","title":"Replika Sekolah Laskar Pelangi"}]},{"day":2,"activities":[{"time":"08:00","title":"Island hopping Pulau Lengkuas"}]},{"day":3,"activities":[{"time":"09:00","title":"Pantai Tanjung Tinggi"},{"time":"13:00","title":"Antar ke bandara"}]}]',
     'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=1200&q=80,https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80'),

    -- 5. Open Trip budaya, tiap Sabtu.
    ('qa-opentrip@tementrip.test',
     'Open Trip Dieng Culture & Sunrise Sikunir', 'Jawa Tengah',
     '["Bukit Sikunir","Telaga Warna","Candi Arjuna","Kawah Sikidang"]',
     'Stasiun Purwokerto', -7.4195, 109.2222,
     'MEETING_POINT', '', '', '[]',
     'Wisata Budaya & Sejarah', 'Open Trip', 550000, 'PER_PERSON', '', 0, '[]',
     5, 18, 2, 1, 18, 7, 70, 4.7, ARRAY[6],
     'Sunrise Bukit Sikunir, Telaga Warna, kompleks Candi Arjuna, dan Kawah Sikidang di dataran tinggi Dieng.',
     E'Transportasi Elf AC\nHomestay 1 malam\nTiket wisata\nMakan 2x\nGuide',
     E'Pengeluaran pribadi',
     '[{"day":1,"activities":[{"time":"07:00","title":"Berkumpul di Stasiun Purwokerto"},{"time":"11:00","title":"Candi Arjuna & Kawah Sikidang"},{"time":"15:00","title":"Telaga Warna"}]},{"day":2,"activities":[{"time":"04:00","title":"Sunrise Bukit Sikunir"},{"time":"10:00","title":"Kembali ke Purwokerto"}]}]',
     'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1200&q=80,https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80'),

    -- 6. Open Trip premium kuota kecil (cepat "kuota tersisa" merah), Selasa & Jumat.
    ('qa-opentrip@tementrip.test',
     'Open Trip Labuan Bajo Sailing Komodo 3D2N', 'Nusa Tenggara Timur',
     '["Pulau Padar","Pink Beach","Pulau Komodo","Manta Point"]',
     'Bandara Komodo, Labuan Bajo', -8.4865, 119.8886,
     'MEETING_POINT', '', '', '[]',
     'Diving & Snorkeling', 'Open Trip', 2750000, 'PER_PERSON', '', 0,
     '[{"id":"gopro","name":"Sewa GoPro","price":150000,"perPerson":false}]',
     6, 12, 3, 1, 12, 12, 65, 4.9, ARRAY[2,5],
     'Sailing 3 hari 2 malam di kapal phinisi: trekking Pulau Padar, Pink Beach, melihat komodo, dan snorkeling di Manta Point.',
     E'Kapal phinisi AC\nMakan 3x sehari\nTiket TN Komodo\nAlat snorkeling\nGuide',
     E'Tiket pesawat\nTips crew',
     '[{"day":1,"activities":[{"time":"10:00","title":"Penjemputan di Bandara Komodo"},{"time":"14:00","title":"Pulau Kelor"},{"time":"17:00","title":"Sunset di Pulau Kalong"}]},{"day":2,"activities":[{"time":"05:00","title":"Sunrise Pulau Padar"},{"time":"09:00","title":"Pink Beach"},{"time":"13:00","title":"Pulau Komodo"}]},{"day":3,"activities":[{"time":"08:00","title":"Snorkeling Manta Point"},{"time":"13:00","title":"Kembali ke Labuan Bajo"}]}]',
     'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80,https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80'),

    -- 7. Private Trip harga per unit: 1 Jeep maks. 6 orang.
    ('qa-bromo@tementrip.test',
     'Private Trip Jeep Bromo Sunrise', 'Jawa Timur',
     '["Penanjakan","Kawah Bromo","Savana"]',
     'Cemoro Lawang, Probolinggo', -7.9300, 112.9530,
     'MEETING_POINT', '', '', '[]',
     'Gunung', 'Private Trip', 850000, 'PER_UNIT', 'Jeep', 6,
     '[{"id":"dokumentasi","name":"Fotografer & drone","price":500000,"perPerson":false}]',
     1, 18, 1, 1, 18, 0, 100, 4.7, NULL,
     'Sewa jeep privat untuk sunrise Bromo. Harga per jeep (maks. 6 orang); 7 orang otomatis 2 jeep.',
     E'Jeep 4x4 privat\nDriver\nTiket masuk TNBTS',
     E'Makan\nPengeluaran pribadi',
     '[{"day":1,"activities":[{"time":"03:00","title":"Penjemputan di Cemoro Lawang"},{"time":"04:30","title":"Sunrise Penanjakan"},{"time":"07:00","title":"Kawah Bromo & Savana"},{"time":"11:00","title":"Kembali ke hotel"}]}]',
     'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80'),

    -- 8. Honeymoon: tepat 2 peserta, usia 18–60.
    ('qa-honeymoon@tementrip.test',
     'Honeymoon Bali Ubud & Nusa Penida 3D2N', 'Bali',
     '["Ubud","Tegallalang","Nusa Penida","Kelingking Beach"]',
     'Bandara I Gusti Ngurah Rai', -8.7482, 115.1672,
     'MEETING_POINT', '', '', '[]',
     'Pantai', 'Honeymoon', 2950000, 'PER_PERSON', '', 0,
     '[{"id":"dinner","name":"Romantic dinner tepi pantai","price":750000,"perPerson":false}]',
     2, 2, 3, 2, 2, 18, 60, 5.0, NULL,
     'Bulan madu privat: villa private pool di Ubud, sawah Tegallalang, dan fast boat ke Nusa Penida.',
     E'Villa private pool 2 malam\nMobil & driver privat\nFast boat Nusa Penida\nSarapan',
     E'Tiket pesawat\nMakan siang & malam',
     '[{"day":1,"activities":[{"time":"12:00","title":"Penjemputan bandara"},{"time":"15:00","title":"Check-in villa Ubud"}]},{"day":2,"activities":[{"time":"07:00","title":"Fast boat ke Nusa Penida"},{"time":"10:00","title":"Kelingking Beach"}]},{"day":3,"activities":[{"time":"08:00","title":"Sawah Tegallalang"},{"time":"14:00","title":"Antar ke bandara"}]}]',
     'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=1200&q=80,https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80'),

    -- 9. Family: minimal 3 peserta, jemput fleksibel di Jogja, add-on per orang.
    ('qa-family@tementrip.test',
     'Family Trip Jogja Heritage 3D2N', 'DI Yogyakarta',
     '["Keraton Yogyakarta","Candi Prambanan","Malioboro","Pantai Parangtritis"]',
     'Stasiun Tugu Yogyakarta', -7.7891, 110.3634,
     'FLEXIBLE', 'Kota Yogyakarta & Sleman', 'Penjemputan di hotel area kota tanpa biaya tambahan.',
     '["Stasiun Tugu Yogyakarta","Bandara YIA","Hotel area Malioboro"]',
     'Keluarga Santai', 'Family', 1450000, 'PER_PERSON', '', 0,
     '[{"id":"jogjabay","name":"Tiket Jogja Bay Waterpark","price":150000,"perPerson":true}]',
     3, 8, 3, 3, 8, 0, 100, 4.4, NULL,
     'Liburan keluarga santai di Jogja: Keraton, Prambanan, Malioboro, dan sunset Parangtritis dengan mobil privat.',
     E'Mobil privat & driver\nHotel 2 malam\nTiket wisata\nSarapan',
     E'Makan siang & malam\nOleh-oleh',
     '[{"day":1,"activities":[{"time":"10:00","title":"Penjemputan"},{"time":"13:00","title":"Keraton Yogyakarta"},{"time":"18:00","title":"Malioboro"}]},{"day":2,"activities":[{"time":"08:00","title":"Candi Prambanan"},{"time":"16:00","title":"Sunset Parangtritis"}]},{"day":3,"activities":[{"time":"09:00","title":"Belanja oleh-oleh"},{"time":"12:00","title":"Antar pulang"}]}]',
     'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1200&q=80,https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1200&q=80'),

    -- 10. Corporate: minimal 10 peserta, usia 17–60.
    ('qa-corporate@tementrip.test',
     'Corporate Outing Bandung Lembang 2D1N', 'Jawa Barat',
     '["Lembang","Farmhouse","Tangkuban Perahu","Gedung Sate"]',
     'Gedung Sate, Bandung', -6.9025, 107.6188,
     'MEETING_POINT', '', '', '[]',
     'City Tour', 'Corporate', 1150000, 'PER_PERSON', '', 0, '[]',
     10, 40, 2, 10, 40, 17, 60, 4.3, NULL,
     'Outing kantor 2 hari 1 malam: team building di Lembang, Farmhouse, dan Tangkuban Perahu dengan bus pariwisata.',
     E'Bus pariwisata\nResort 1 malam\nTeam building & MC\nMakan 4x\nTiket wisata',
     E'Pengeluaran pribadi',
     '[{"day":1,"activities":[{"time":"07:00","title":"Berkumpul di Gedung Sate"},{"time":"10:00","title":"Team building di Lembang"},{"time":"19:00","title":"Gala dinner"}]},{"day":2,"activities":[{"time":"08:00","title":"Tangkuban Perahu"},{"time":"12:00","title":"Farmhouse Lembang"},{"time":"16:00","title":"Kembali ke Bandung"}]}]',
     'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=1200&q=80')
    ) AS x(provider_email, name, destination, destinations, meeting_point, lat, lng, pickup_mode, pickup_area, pickup_notes, pickup_points, category, trip_type, price, pricing_mode, unit_name, unit_capacity, add_ons, quota_min, quota_max, duration, min_guests, max_guests, min_age, max_age, rating, weekdays, description, included, excluded, itinerary, images)
    LOOP
        SELECT id INTO v_provider_id FROM providers WHERE lower(email) = t.provider_email;

        IF t.weekdays IS NOT NULL THEN
            -- Open Trip: hari tertentu tiap minggu, mulai besok s.d. 365 hari,
            -- maksimal 100 tanggal (batas validasi backend).
            SELECT COALESCE(json_agg(to_char(d, 'YYYY-MM-DD') ORDER BY d), '[]')::text,
                   to_char(MIN(d), 'YYYY-MM-DD'), to_char(MAX(d), 'YYYY-MM-DD')
            INTO v_departures, v_start, v_end
            FROM (
                SELECT d::date AS d
                FROM generate_series(v_today + 1, v_today + 365, INTERVAL '1 day') AS d
                WHERE EXTRACT(ISODOW FROM d)::int = ANY (t.weekdays)
                ORDER BY d
                LIMIT 100
            ) s;
            v_schedule := 'Berangkat rutin setiap ' ||
                (SELECT string_agg((ARRAY['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'])[w], ' & ' ORDER BY w)
                 FROM unnest(t.weekdays) AS w);
        ELSE
            v_departures := '[]';
            v_start := to_char(v_today + 7, 'YYYY-MM-DD');
            v_end := to_char(v_horizon, 'YYYY-MM-DD');
            v_schedule := 'Bebas pilih tanggal (H-7 s.d. 3 bulan ke depan)';
        END IF;

        SELECT id INTO v_package_id
        FROM packages
        WHERE provider_id = v_provider_id AND name = t.name AND deleted_at IS NULL
        ORDER BY id LIMIT 1;

        IF v_package_id IS NULL THEN
            INSERT INTO packages (
                provider_id, name, destination, destinations, meeting_point,
                meeting_point_latitude, meeting_point_longitude, pickup_mode, pickup_area, pickup_notes,
                pickup_points, departure_dates, category, trip_type, price, pricing_mode, unit_name,
                unit_capacity, add_ons, quota_min, quota_used, quota_max, start_date, end_date, schedule,
                duration, min_guests, max_guests, min_age, max_age, status, rating, description,
                included_facilities, excluded_facilities, itinerary, image, images, created_at, updated_at
            ) VALUES (
                v_provider_id, t.name, t.destination, t.destinations, t.meeting_point,
                t.lat, t.lng, t.pickup_mode, t.pickup_area, t.pickup_notes,
                t.pickup_points, v_departures, t.category, t.trip_type, t.price, t.pricing_mode, t.unit_name,
                t.unit_capacity, t.add_ons, t.quota_min, 0, t.quota_max, v_start, v_end, v_schedule,
                t.duration, t.min_guests, t.max_guests, t.min_age, t.max_age, 'Aktif', t.rating, t.description,
                t.included, t.excluded, t.itinerary, split_part(t.images, ',', 1), t.images, NOW(), NOW()
            )
            RETURNING id INTO v_package_id;
        ELSE
            -- quota_used tidak disentuh: dihitung ulang backend dari booking.
            UPDATE packages
            SET destination = t.destination, destinations = t.destinations, meeting_point = t.meeting_point,
                meeting_point_latitude = t.lat, meeting_point_longitude = t.lng,
                pickup_mode = t.pickup_mode, pickup_area = t.pickup_area, pickup_notes = t.pickup_notes,
                pickup_points = t.pickup_points, departure_dates = v_departures, category = t.category,
                trip_type = t.trip_type, price = t.price, pricing_mode = t.pricing_mode, unit_name = t.unit_name,
                unit_capacity = t.unit_capacity, add_ons = t.add_ons, quota_min = t.quota_min,
                quota_max = t.quota_max, start_date = v_start, end_date = v_end, schedule = v_schedule,
                duration = t.duration, min_guests = t.min_guests, max_guests = t.max_guests,
                min_age = t.min_age, max_age = t.max_age, status = 'Aktif', rating = t.rating,
                description = t.description, included_facilities = t.included,
                excluded_facilities = t.excluded, itinerary = t.itinerary,
                image = split_part(t.images, ',', 1), images = t.images, updated_at = NOW()
            WHERE id = v_package_id;
        END IF;

        IF t.weekdays IS NULL THEN
            -- Buka ulang semua tanggal H+7 s.d. batas 3 bulan. Tanggal yang
            -- sudah dikunci booking (BOOKED / booking_id) tidak diubah.
            DELETE FROM package_dates
            WHERE package_id = v_package_id AND status = 'OPEN' AND booking_id IS NULL;

            INSERT INTO package_dates (package_id, date, status, origin, created_at, updated_at)
            SELECT v_package_id, to_char(d, 'YYYY-MM-DD'), 'OPEN', 'PROVIDER', NOW(), NOW()
            FROM generate_series(v_today + 7, v_horizon, INTERVAL '1 day') AS d
            LIMIT 100
            ON CONFLICT (package_id, date) DO NOTHING;
        END IF;

        RAISE NOTICE 'Paket #% siap: % (% s.d. %)', v_package_id, t.name, v_start, v_end;
    END LOOP;
END $$;

-- Ringkasan hasil seed.
SELECT p.id, p.name, p.trip_type, p.price, p.quota_max, p.start_date, p.end_date,
       CASE WHEN p.trip_type = 'Open Trip'
            THEN json_array_length(p.departure_dates::json)
            ELSE (SELECT COUNT(*) FROM package_dates d WHERE d.package_id = p.id AND d.status = 'OPEN')
       END AS jumlah_tanggal,
       pr.email AS akun_mitra
FROM packages p
JOIN providers pr ON pr.id = p.provider_id
WHERE pr.email LIKE 'qa-%@tementrip.test' AND p.deleted_at IS NULL
ORDER BY p.id;
