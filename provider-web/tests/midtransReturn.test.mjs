import assert from 'node:assert/strict';
import test from 'node:test';
import { midtransReturnStatus } from '../src/utils/midtransReturn.ts';

test('Snap return status applies only to the booking that owns the order', () => {
  const staleSearch = '?order_id=TK-20261025-AAAA1111-1761350000000&status_code=200&transaction_status=settlement';
  // Booking berikutnya di tab yang sama tidak boleh ikut terbaca sudah bayar.
  assert.equal(midtransReturnStatus('TK-20261025-BCJ8JB6M', staleSearch, '#/halaman-pembayaran?code=TK-20261025-BCJ8JB6M'), '');
  assert.equal(midtransReturnStatus('TK-20261025-AAAA1111', staleSearch, '#/halaman-pembayaran?code=TK-20261025-AAAA1111'), 'settlement');
  // Parameter setelah hash dari order baru menang atas query lama.
  const hash = '#/halaman-pembayaran?code=TK-2&order_id=TK-2-1761350000001&transaction_status=Pending';
  assert.equal(midtransReturnStatus('TK-2', staleSearch, hash), 'pending');
  assert.equal(midtransReturnStatus('TK-2', '', '#/halaman-pembayaran?code=TK-2'), '');
  assert.equal(midtransReturnStatus('TK-2', '?transaction_status=settlement', '#/halaman-pembayaran?code=TK-2'), '');
});
