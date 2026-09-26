import 'package:flutter/material.dart';

import 'package:customer_mobile/theme/app_theme.dart';

// Isi dokumen legal disalin dari `provider-web/src/components/LegalModals.tsx`.

class _LegalSection {
  final String title;
  final List<String> items;

  const _LegalSection(this.title, this.items);
}

class _LegalDocument {
  final String heading;
  final String intro;
  final List<_LegalSection> sections;

  const _LegalDocument(this.heading, this.intro, this.sections);
}

const _generalTerms = _LegalDocument(
  'SYARAT DAN KETENTUAN PLATFORM TRIPKITA',
  'Ketentuan yang berlaku bagi setiap pengguna platform TripKita. Dengan mengakses, mendaftar, atau menggunakan layanan TripKita, pengguna dianggap telah membaca, memahami, dan menyetujui seluruh ketentuan di bawah ini.',
  [
    _LegalSection('DEFINISI', [
      'TripKita: Platform digital beserta pengelola dan sistem pendukungnya.',
      'Customer: Pengguna yang mencari, memesan, atau menggunakan layanan perjalanan melalui TripKita.',
      'Provider: Pihak penyedia layanan perjalanan yang terdaftar di TripKita.',
      'Platform: Situs web, aplikasi, dan sarana digital lain milik TemenTrip / TripKita.',
      'Booking: Pemesanan layanan perjalanan yang dilakukan melalui Platform.',
      'Force Majeure: Keadaan darurat di luar kendali wajar para pihak (bencana alam, cuaca ekstrem, dll).',
    ]),
    _LegalSection('LAYANAN TRIPKITA', [
      '2.1 TripKita menyediakan sarana perantara bagi Customer dan Provider dalam proses pencarian hingga pemesanan trip.',
      '2.2 Kebenaran dan kelengkapan informasi perjalanan sepenuhnya menjadi tanggung jawab Provider yang mempublikasikannya.',
      '2.3 TripKita berhak membatasi atau menangguhkan akun jika ditemukan aktivitas yang melanggar ketentuan hukum.',
    ]),
    _LegalSection('PENGGUNAAN PLATFORM', [
      '3.1 Customer wajib memberikan informasi identitas yang valid dan jujur.',
      '3.2 Keamanan data akun merupakan tanggung jawab penuh masing-masing pengguna.',
      '3.3 Dilarang menggunakan platform untuk penipuan, transaksi di luar sistem resmi, atau merugikan pihak lain.',
    ]),
    _LegalSection('HAK DAN KEWAJIBAN CUSTOMER', [
      '4.1 Customer berhak mendapatkan informasi lengkap dan akurat mengenai paket yang dipesan.',
      '4.2 Customer berhak menerima konfirmasi e-tiket / booking setelah pembayaran lunas.',
      '4.3 Customer wajib mematuhi aturan perjalanan dan petunjuk yang ditetapkan oleh Provider.',
    ]),
    _LegalSection('PEMBATALAN, REFUND & RESCHEDULE', [
      '5.1 Pembatalan oleh Customer (Strict H-7 Policy):',
      '• Pembatalan dilakukan ≥ 7 hari sebelum keberangkatan (H-7 atau lebih lama): Customer berhak menerima pengembalian dana 100% (Full Refund).',
      '• Pembatalan dilakukan < 7 hari sebelum keberangkatan (H-6 s/d H-0): Dikenakan biaya pembatalan 100% (0% Refund / Uang Hangus). Pembayaran diteruskan ke Provider sebagai ganti rugi slot operasional.',
      '5.2 Pembatalan oleh Provider / Cuaca Buruk / Kuota Tidak Terpenuhi:',
      '• Jika trip dibatalkan oleh Provider karena cuaca buruk (Force Majeure) atau kuota minimal Open Trip belum terpenuhi di H-3, Customer berhak memilih Full Refund 100% atau Pindah Jadwal (Reschedule).',
      '• Penjadwalan ulang (Reschedule) akibat kuota kurang berlaku maksimal 1 (satu) kali. Jika pada jadwal pengganti kuota masih tidak terpenuhi di H-3, sistem akan melakukan Full Refund 100% otomatis.',
      '5.3 Pembayaran Penuh & Dana Tertahan: Customer membayar penuh di muka melalui checkout iPaymu, tanpa uang muka (DP) dari customer. Setelah dipotong biaya layanan dan komisi platform, buku besar TemenTrip mencatat separuh hak Provider tersedia untuk diajukan sebagai biaya persiapan dan separuh sisanya baru tersedia setelah trip selesai.',
    ]),
  ],
);

const _customerRegistrationTerms = _LegalDocument(
  'SYARAT & KETENTUAN PENDAFTARAN CUSTOMER',
  'Dokumen persetujuan pendaftaran akun Customer pada platform TemenTrip / TripKita.',
  [
    _LegalSection('Persyaratan Pendaftaran', [
      '1.1 Memberikan data identitas yang sah dan dapat dipertanggungjawabkan.',
      '1.2 Menggunakan nama, email, dan nomor WhatsApp yang masih aktif.',
      '1.3 Memenuhi persyaratan usia dan kecakapan hukum sesuai perundang-undangan.',
      '1.4 Tidak diperkenankan membuat akun menggunakan identitas orang lain tanpa hak.',
    ]),
    _LegalSection('Kebenaran & Keamanan Informasi', [
      '2.1 Customer bertanggung jawab penuh atas kebenaran data yang didaftarkan.',
      '2.2 Customer wajib menjaga kerahasiaan kata sandi dan keamanan akun masing-masing.',
    ]),
    _LegalSection('Kebijakan Pembatalan & Refund (Strict H-7)', [
      '3.1 Pembatalan oleh Pemesan ≥ 7 hari sebelum keberangkatan berhak atas 100% Full Refund.',
      '3.2 Pembatalan oleh Pemesan < 7 hari (H-6 s/d H-0) berstatus 0% Refund (Uang Hangus).',
      '3.3 Jika trip dibatalkan oleh Provider/Cuaca/Kuota Kurang, Pemesan berhak atas 100% Refund atau Reschedule Maks 1x.',
    ]),
    _LegalSection('Persetujuan Elektronik', [
      'Dengan mencentang persetujuan ini, Customer menyatakan telah membaca, memahami, dan menyetujui seluruh ketentuan dengan kekuatan hukum mengikat secara elektronik.',
    ]),
  ],
);

class _LegalBody extends StatelessWidget {
  final _LegalDocument doc;

  const _LegalBody(this.doc);

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            children: [
              Text(doc.heading,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.textDark)),
              const SizedBox(height: 8),
              Text(doc.intro,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 12.5, color: AppColors.textMuted, height: 1.5)),
            ],
          ),
        ),
        const SizedBox(height: 14),
        for (var i = 0; i < doc.sections.length; i++) ...[
          Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${i + 1}. ${doc.sections[i].title}',
                    style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: AppColors.primary)),
                const SizedBox(height: 8),
                for (final item in doc.sections[i].items)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Text(item, style: const TextStyle(fontSize: 12.5, color: AppColors.textBody, height: 1.5)),
                  ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

Future<void> _showLegalSheet(BuildContext context, String title, _LegalDocument doc) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppColors.background,
    builder: (context) => DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.85,
      maxChildSize: 0.95,
      builder: (context, controller) => Column(
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(20, 16, 8, 12),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              border: Border(bottom: BorderSide(color: AppColors.border)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(title,
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textDark)),
                ),
                IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close)),
              ],
            ),
          ),
          Expanded(
            child: ListView(
              controller: controller,
              padding: const EdgeInsets.all(16),
              children: [_LegalBody(doc)],
            ),
          ),
        ],
      ),
    ),
  );
}

Future<void> showGeneralTerms(BuildContext context) =>
    _showLegalSheet(context, 'Syarat & Ketentuan Customer TemenTrip', _generalTerms);

Future<void> showCancellationPolicy(BuildContext context) =>
    _showLegalSheet(context, 'Kebijakan Pembatalan Strict H-7 TripKita', _customerRegistrationTerms);

Future<void> showRegistrationTerms(BuildContext context) =>
    _showLegalSheet(context, 'Syarat & Ketentuan Pendaftaran Customer', _customerRegistrationTerms);

/// Persetujuan wajib saat customer pertama kali masuk, seperti modal global
/// di `App.tsx` web. Tidak dapat ditutup tanpa menyetujui.
Future<void> showMandatoryCustomerTerms(BuildContext context) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    isDismissible: false,
    enableDrag: false,
    backgroundColor: AppColors.background,
    builder: (context) => PopScope(
      canPop: false,
      child: SizedBox(
        height: MediaQuery.of(context).size.height * 0.88,
        child: Column(
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 14),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                border: Border(bottom: BorderSide(color: AppColors.border)),
              ),
              child: const Text('Persetujuan Syarat & Ketentuan Customer TemenTrip',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textDark)),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    margin: const EdgeInsets.only(bottom: 14),
                    decoration: BoxDecoration(
                      color: AppColors.accentLight,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFBAE6FD)),
                    ),
                    child: const Text(
                      'Selamat datang di TemenTrip! Sebelum melanjutkan, harap baca dan menyetujui Syarat & Ketentuan Pendaftaran Customer berikut.',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.primaryDark),
                    ),
                  ),
                  const _LegalBody(_customerRegistrationTerms),
                ],
              ),
            ),
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                child: SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Saya Menyetujui Syarat & Ketentuan & Lanjutkan', textAlign: TextAlign.center),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}
