-- Pembayaran customer sementara melalui transfer bank manual.
-- Booking berstatus PAYMENT_REVIEW tetap menahan kuota, tetapi belum terlihat
-- oleh provider sampai admin menyetujuinya menjadi PAID.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_proof VARCHAR(500);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_proof_submitted_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_review_deadline TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_reviewed_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_reviewed_by BIGINT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_review_notes VARCHAR(500);

CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_proof_submitted_at ON bookings(payment_proof_submitted_at);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_review_deadline ON bookings(payment_review_deadline);

UPDATE bookings
SET payment_method = 'Transfer Bank Manual'
WHERE status = 'PENDING_PAYMENT' AND paid_at IS NULL;
