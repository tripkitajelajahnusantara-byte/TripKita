-- Metadata native iPaymu. Kolom legacy xendit_invoice_id tetap dipertahankan
-- selama masa kompatibilitas dengan data dan klien versi lama.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ipaymu_session_id VARCHAR(255);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ipaymu_transaction_id VARCHAR(255);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_bookings_ipaymu_session_id ON bookings(ipaymu_session_id);
CREATE INDEX IF NOT EXISTS idx_bookings_ipaymu_transaction_id ON bookings(ipaymu_transaction_id);
