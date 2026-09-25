// Aturan validasi yang sama dengan form web customer.

final _nameLetters = RegExp(r'^[a-zA-Z\s]+$');
final _registerName = RegExp(r'^[a-zA-Z\s]{3,50}$');
final _email = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
final _bookingPhone = RegExp(r'^(08|62)\d{8,12}$');
final _registerPhone = RegExp(r'^(081|082|083|085|087|088|089|08|62)\d{7,11}$');

String? validateBookerName(String value) {
  final v = value.trim();
  if (v.length < 3) return 'Nama pemesan minimal 3 karakter.';
  if (!_nameLetters.hasMatch(value)) {
    return 'Nama hanya boleh berisi huruf dan spasi (tanpa angka/karakter khusus).';
  }
  return null;
}

String? validateParticipantName(String value, int index) {
  final v = value.trim();
  if (v.length < 3) return 'Nama Peserta $index minimal 3 karakter.';
  if (!_nameLetters.hasMatch(value)) return 'Nama Peserta $index hanya boleh berisi huruf.';
  return null;
}

String? validateEmail(String value) {
  if (value.trim().isEmpty) return 'Alamat email wajib diisi.';
  if (!_email.hasMatch(value.trim())) {
    return 'Format email tidak valid (harus memiliki "@" dan domain, contoh: user@gmail.com).';
  }
  return null;
}

String? validateBookerPhone(String value) {
  if (!_bookingPhone.hasMatch(value.trim())) {
    return 'Nomor HP pemesan harus diawali 08 atau 62 (10–14 digit angka).';
  }
  return null;
}

String? validateParticipantPhone(String value, int index) {
  if (!_bookingPhone.hasMatch(value.trim())) {
    return 'Nomor HP Peserta $index harus diawali 08 atau 62 (10–14 digit angka).';
  }
  return null;
}

String? validateRegisterName(String value) {
  if (value.trim().isEmpty) return 'Nama lengkap wajib diisi.';
  if (!_registerName.hasMatch(value.trim())) return 'Nama lengkap (3-50 karakter) hanya boleh berisi huruf dan spasi.';
  return null;
}

String? validateRegisterPhone(String value) {
  if (value.trim().isEmpty) return 'Nomor WhatsApp wajib diisi.';
  if (!_registerPhone.hasMatch(value.trim())) return 'Nomor WhatsApp harus diawali 081 atau 08 (10–14 digit angka).';
  return null;
}
