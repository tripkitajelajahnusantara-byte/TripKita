import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Sourcemap tidak diterbitkan agar kode sumber tidak ikut terekspos publik.
    sourcemap: false,
    // Halaman sudah dipecah lewat React.lazy; batas ini menjaga agar chunk baru
    // yang membengkak tetap terlihat saat build.
    chunkSizeWarningLimit: 250,
    rolldownOptions: {
      output: {
        // Dependency pihak ketiga dipisah supaya cache browser tidak gugur
        // setiap kali kode aplikasi berubah.
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('leaflet')) return 'vendor-maps'
            if (id.includes('react')) return 'vendor-react'
            return 'vendor'
          }
        },
      },
    },
  },
})
