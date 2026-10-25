// Status saat customer kembali dari halaman Snap. Snap dapat menaruh parameter
// di query string maupun setelah hash. Navigasi SPA hanya mengganti hash, jadi
// query dari pembayaran booking sebelumnya bisa tertinggal di URL: status hanya
// dipakai bila order_id milik booking ini (format "<kode booking>-<unix milli>").
export function midtransReturnStatus(bookingCode: string, search: string, hash: string): string {
  for (const part of [hash, search]) {
    const params = new URLSearchParams(part.slice(part.indexOf('?') + 1));
    if (params.get('order_id')?.startsWith(`${bookingCode}-`)) {
      return (params.get('transaction_status') || '').toLowerCase();
    }
  }
  return '';
}
