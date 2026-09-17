#!/usr/bin/env bash
#
# Uji integrasi pencairan otomatis terhadap Xendit TEST MODE di staging.
#
# Skrip ini menjalankan lima skenario yang disediakan Xendit (satu sukses, empat
# ragam kegagalan) lalu memeriksa dua hal setelah tiap skenario:
#   1. status pengajuan pencairan, dan
#   2. saldo buku besar mitra.
#
# Yang diperiksa bukan sekadar "API tidak error", melainkan bahwa uang yang gagal
# dikirim benar-benar kembali ke saldo mitra.
#
# PRASYARAT
#   - Backend staging berjalan dengan ENABLE_AUTOMATIC_PAYOUT=true dan
#     XENDIT_SECRET_KEY berupa kunci DEVELOPMENT (xnd_development_...).
#   - BACKEND_URL staging dapat dijangkau dari internet, dan callback payout
#     Xendit mengarah ke /api/v1/public/webhooks/xendit/payout.
#   - psql tersedia, serta akses ke database staging.
#
# JANGAN dijalankan terhadap database production: skrip ini membuat dan
# menghapus data.
#
# PEMAKAIAN
#   export API_BASE_URL="https://staging-api.example.com/api/v1"
#   export DATABASE_URL="postgres://user:pass@host:5432/tripkita_staging?sslmode=require"
#   # atau, bila database hanya terjangkau lewat container:
#   # export PSQL_CMD="docker compose exec -T postgres psql -U tripkita -d tripkita"
#   export ADMIN_EMAIL="admin@tementrip.id"
#   export ADMIN_PASSWORD="..."
#   bash backend/scripts/test_staging_payout.sh

set -uo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:8080/api/v1}"
DATABASE_URL="${DATABASE_URL:-}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@tementrip.id}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"
# Berapa lama menunggu callback Xendit sebelum dianggap menggantung.
CALLBACK_TIMEOUT_SECONDS="${CALLBACK_TIMEOUT_SECONDS:-90}"
# Perintah psql dapat diganti bila database staging hanya terjangkau lewat
# container atau bastion, mis:
#   PSQL_CMD="docker compose exec -T postgres psql -U tripkita -d tripkita"
# Bila diisi, DATABASE_URL tidak diteruskan ke psql.
PSQL_CMD="${PSQL_CMD:-}"

# Rentang id khusus uji, dijauhkan dari data nyata.
TEST_PROVIDER_ID=9500
TEST_PACKAGE_ID=9500
TEST_BOOKING_ID=9500
PAYOUT_ID_BASE=9500

# Booking senilai 1.005.000 menghasilkan bagian mitra 850.000
# ((1005000 - 5000 biaya layanan) x 85%), dengan DP 425.000.
BOOKING_TOTAL=1005000
PAYOUT_AMOUNT=425000

RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; BOLD=$'\033[1m'; RESET=$'\033[0m'

pass_count=0
fail_count=0

die() { echo "${RED}FATAL: $*${RESET}" >&2; exit 1; }
info() { echo "${BOLD}$*${RESET}"; }

if [ -n "$PSQL_CMD" ]; then
  psql_q() { $PSQL_CMD -qtA -c "$1" 2>/dev/null | tr -d '[:space:]'; }
  psql_exec() { $PSQL_CMD -v ON_ERROR_STOP=1 -q >/dev/null; }
else
  psql_q() { psql "$DATABASE_URL" -qtA -c "$1" 2>/dev/null | tr -d '[:space:]'; }
  psql_exec() { psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q >/dev/null; }
fi

# ---------------------------------------------------------------- prasyarat --
command -v curl >/dev/null || die "curl tidak ditemukan pada PATH."
if [ -z "$PSQL_CMD" ]; then
  command -v psql >/dev/null || die "psql tidak ditemukan pada PATH (atau isi PSQL_CMD)."
  [ -n "$DATABASE_URL" ] || die "DATABASE_URL belum diisi (atau isi PSQL_CMD)."
fi
[ -n "$ADMIN_PASSWORD" ] || die "ADMIN_PASSWORD belum diisi."

info "== Pemeriksaan awal =="

if ! psql_q "SELECT 1" >/dev/null 2>&1; then
  die "Tidak dapat terhubung ke database staging."
fi
echo "  database          : terhubung"

readyz="${API_BASE_URL%/api/v1}/readyz"
if [ "$(curl -s -o /dev/null -w '%{http_code}' "$readyz")" != "200" ]; then
  die "Backend tidak siap pada $readyz"
fi
echo "  backend           : siap"

# Pengaman: jangan pernah menjalankan ini terhadap data production.
live_bookings=$(psql_q "SELECT COUNT(*) FROM bookings WHERE id < 9000 AND status IN ('PAID','CONFIRMED','COMPLETED')")
if [ "${live_bookings:-0}" -gt 100 ]; then
  echo "${YELLOW}  PERINGATAN: database ini memuat ${live_bookings} booking berbayar.${RESET}"
  echo "${YELLOW}  Pastikan ini benar-benar staging, bukan production.${RESET}"
  read -r -p "  Ketik 'staging' untuk melanjutkan: " confirm
  [ "$confirm" = "staging" ] || die "Dibatalkan."
fi

token=$(curl -s -X POST "$API_BASE_URL/public/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
[ -n "$token" ] || die "Login admin gagal untuk $ADMIN_EMAIL"
echo "  login admin       : berhasil"
echo

# ------------------------------------------------------------------- seeding --
seed_base() {
  psql_exec <<SQL
BEGIN;
INSERT INTO providers (id, business_name, business_category, operational_province, operational_city,
                       description, pic_name, email, password_hash, whats_app, is_verified, role, status,
                       bank_name, bank_account, bank_account_name, created_at, updated_at)
VALUES ($TEST_PROVIDER_ID, 'Mitra Uji Pencairan', 'tour', 'Bali', 'Denpasar', 'data uji otomatis', 'PIC Uji',
        'uji-pencairan-staging@example.com', 'tidak-dipakai', '0', true, 'PROVIDER', 'APPROVED',
        'BCA', '1234567890', 'Mitra Uji Pencairan', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO packages (id, provider_id, name, destination, schedule, category, trip_type, price, quota_max, status, created_at, updated_at)
VALUES ($TEST_PACKAGE_ID, $TEST_PROVIDER_ID, 'Paket Uji Pencairan', 'Bali', 'Setiap hari', 'tour', 'open',
        1000000, 10, 'Nonaktif', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO bookings (id, booking_code, provider_id, package_id, customer_name, customer_initial,
                      trip_date, guests, total_price, status, payment_method, created_at, updated_at)
VALUES ($TEST_BOOKING_ID, 'TK-UJI-PAYOUT-STG', $TEST_PROVIDER_ID, $TEST_PACKAGE_ID, 'Pelanggan Uji', 'PU',
        NOW() + INTERVAL '60 days', 1, $BOOKING_TOTAL, 'PAID', 'Uji Staging', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
COMMIT;
SQL
}

# Tiap skenario dimulai dari saldo yang sama agar hasilnya dapat dibandingkan.
reset_state() {
  local payout_id="$1" account_number="$2" holder_name="$3"
  psql_exec <<SQL
BEGIN;
UPDATE providers
   SET bank_account = '$account_number', bank_account_name = '$holder_name', bank_name = 'BCA'
 WHERE id = $TEST_PROVIDER_ID;

INSERT INTO provider_balances (provider_id, available_balance, held_balance, total_earned, updated_at)
VALUES ($TEST_PROVIDER_ID, $PAYOUT_AMOUNT, $PAYOUT_AMOUNT, 850000, NOW())
ON CONFLICT (provider_id) DO UPDATE
   SET available_balance = $PAYOUT_AMOUNT, held_balance = $PAYOUT_AMOUNT, total_earned = 850000, updated_at = NOW();

DELETE FROM payouts WHERE id = $payout_id;
INSERT INTO payouts (id, provider_id, booking_id, amount, type, status, bank_name, bank_account,
                     bank_account_name, notes, created_at, updated_at)
VALUES ($payout_id, $TEST_PROVIDER_ID, $TEST_BOOKING_ID, $PAYOUT_AMOUNT, 'DP_50', 'PENDING', 'BCA',
        '$account_number', '$holder_name', 'Pengajuan uji staging', NOW(), NOW());
COMMIT;
SQL
}

# Menunggu status akhir; PROCESSING berarti callback belum tiba.
wait_for_terminal_status() {
  local payout_id="$1" waited=0 status=""
  while [ "$waited" -lt "$CALLBACK_TIMEOUT_SECONDS" ]; do
    status=$(psql_q "SELECT status FROM payouts WHERE id = $payout_id")
    case "$status" in
      APPROVED|FAILED|REJECTED) echo "$status"; return 0 ;;
    esac
    sleep 3
    waited=$((waited + 3))
  done
  echo "${status:-TIDAK_DIKETAHUI}"
  return 1
}

check() {
  local label="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "    ${GREEN}OK${RESET}   $label: $actual"
    return 0
  fi
  echo "    ${RED}GAGAL${RESET} $label: dapat '$actual', diharapkan '$expected'"
  return 1
}

# scenario <offset> <nama> <no_rekening> <nama_pemilik> <status_harapan> <saldo_harapan>
scenario() {
  local offset="$1" name="$2" account="$3" holder="$4" want_status="$5" want_balance="$6"
  local payout_id=$((PAYOUT_ID_BASE + offset))
  local ok=0

  info "-- Skenario: $name (rekening $account) --"
  reset_state "$payout_id" "$account" "$holder"

  local http
  http=$(curl -s -o /tmp/staging_payout_resp.json -w '%{http_code}' \
    -X PUT "$API_BASE_URL/admin/payouts/$payout_id/process" \
    -H 'Content-Type: application/json' -H "Authorization: Bearer $token" \
    -d '{"status":"APPROVED","notes":"Uji integrasi pencairan staging"}')
  echo "    persetujuan admin -> HTTP $http"

  local status
  if ! status=$(wait_for_terminal_status "$payout_id"); then
    echo "    ${RED}GAGAL${RESET} status tidak final dalam ${CALLBACK_TIMEOUT_SECONDS}s (terakhir: $status)"
    echo "    ${YELLOW}Penyebab paling umum: callback Xendit tidak dapat menjangkau backend staging.${RESET}"
    fail_count=$((fail_count + 1))
    return
  fi

  check "status pencairan" "$want_status" "$status" || ok=1

  local balance
  balance=$(psql_q "SELECT available_balance FROM provider_balances WHERE provider_id = $TEST_PROVIDER_ID")
  check "saldo tersedia" "$want_balance" "$balance" || ok=1

  if [ "$want_status" = "FAILED" ]; then
    local failure_code
    failure_code=$(psql_q "SELECT COALESCE(failure_code,'') FROM payouts WHERE id = $payout_id")
    if [ -n "$failure_code" ]; then
      echo "    ${GREEN}OK${RESET}   kode kegagalan tercatat: $failure_code"
    else
      echo "    ${RED}GAGAL${RESET} kode kegagalan tidak tercatat"
      ok=1
    fi
  fi

  if [ "$ok" -eq 0 ]; then
    pass_count=$((pass_count + 1))
  else
    fail_count=$((fail_count + 1))
  fi
  echo
}

cleanup() {
  psql_exec <<SQL
BEGIN;
DELETE FROM payouts WHERE provider_id = $TEST_PROVIDER_ID;
DELETE FROM refund_records WHERE booking_id = $TEST_BOOKING_ID;
DELETE FROM held_settlements WHERE booking_id = $TEST_BOOKING_ID;
DELETE FROM bookings WHERE id = $TEST_BOOKING_ID;
DELETE FROM packages WHERE id = $TEST_PACKAGE_ID;
DELETE FROM provider_balances WHERE provider_id = $TEST_PROVIDER_ID;
DELETE FROM providers WHERE id = $TEST_PROVIDER_ID;
COMMIT;
SQL
}
trap cleanup EXIT

seed_base

# Pemeriksaan bahwa flag benar-benar menyala: dengan pencairan otomatis, status
# tidak boleh langsung APPROVED tanpa melewati gateway.
info "== Memastikan ENABLE_AUTOMATIC_PAYOUT menyala =="
reset_state $((PAYOUT_ID_BASE + 9)) "1234567890" "Mitra Uji Pencairan"
curl -s -o /dev/null -X PUT "$API_BASE_URL/admin/payouts/$((PAYOUT_ID_BASE + 9))/process" \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $token" \
  -d '{"status":"APPROVED","notes":"Pemeriksaan flag pencairan otomatis"}'
probe_channel=$(psql_q "SELECT COALESCE(channel_code,'') FROM payouts WHERE id = $((PAYOUT_ID_BASE + 9))")
if [ -z "$probe_channel" ]; then
  die "Pencairan diproses tanpa channel code: ENABLE_AUTOMATIC_PAYOUT tampaknya masih false."
fi
echo "  flag menyala      : ya (channel $probe_channel)"
echo

info "== Menjalankan skenario Xendit test mode =="
echo

# Sukses: saldo tetap terpotong (425000 -> 0).
scenario 1 "Pencairan berhasil"          "1234567890" "Mitra Uji Pencairan" "APPROVED" "0"
# Gagal: saldo wajib kembali utuh (425000).
scenario 2 "Transfer error"              "98018521"   "Mitra Uji Pencairan" "FAILED"   "$PAYOUT_AMOUNT"
scenario 3 "Gangguan jaringan sementara" "123456"     "Mitra Uji Pencairan" "FAILED"   "$PAYOUT_AMOUNT"
scenario 4 "Ditolak channel"             "999999"     "Mitra Uji Pencairan" "FAILED"   "$PAYOUT_AMOUNT"
scenario 5 "Rekening tujuan tidak valid" "121212"     "Mitra Uji Pencairan" "FAILED"   "$PAYOUT_AMOUNT"

info "== Ringkasan =="
echo "  lulus : $pass_count"
echo "  gagal : $fail_count"
echo

if [ "$fail_count" -gt 0 ]; then
  echo "${RED}${BOLD}Ada skenario yang gagal. Jangan aktifkan pencairan otomatis di production.${RESET}"
  exit 1
fi
echo "${GREEN}${BOLD}Seluruh skenario lulus.${RESET}"
echo "Ingat: test mode tidak memverifikasi nomor rekening ke bank sungguhan."
echo "Kesalahan ketik rekening mitra hanya akan terlihat di production."
