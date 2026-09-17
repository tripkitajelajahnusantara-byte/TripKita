import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'node_modules']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Pelanggaran di bawah ini adalah utang gaya penulisan yang tersebar di
      // basis kode lama. Statusnya diturunkan menjadi peringatan supaya
      // `npm run lint` tetap dapat dipakai sebagai gate CI untuk cacat nyata
      // (aturan hook, variabel tak terpakai, ekspresi menggantung) dan tidak
      // tenggelam dalam ratusan error yang akhirnya diabaikan.
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-refresh/only-export-components': 'warn',

      // Aturan berorientasi React Compiler. Compiler belum diaktifkan di proyek
      // ini dan pola yang dilaporkan (fungsi dipanggil dari handler sebelum
      // deklarasinya, Date.now() saat render) berjalan benar pada runtime saat
      // ini, jadi statusnya peringatan sampai pola tersebut dirapikan.
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',

      // Parameter berawalan garis bawah sengaja tidak dipakai (mis. pembeda
      // signature callback), jadi tidak dilaporkan.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
])
