import { useCallback, useRef, useState } from 'react';

// useActionLock menjaga agar hanya satu aksi yang mengubah data berjalan pada
// satu waktu. Kunci disimpan di ref karena state React baru terbarui setelah
// render berikutnya, sehingga klik ganda cepat masih bisa lolos bila hanya
// mengandalkan state. `pending` dipakai UI untuk menampilkan indikator pada
// tombol yang sedang diproses dan menonaktifkan tombol lain.
export function useActionLock() {
  const lockRef = useRef<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const run = useCallback(async <T,>(key: string, action: () => Promise<T>): Promise<T | undefined> => {
    if (lockRef.current) return undefined;
    lockRef.current = key;
    setPending(key);
    try {
      return await action();
    } finally {
      lockRef.current = null;
      setPending(null);
    }
  }, []);

  return { pending, isBusy: pending !== null, run };
}
