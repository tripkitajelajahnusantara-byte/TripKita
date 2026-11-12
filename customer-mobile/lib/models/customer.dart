/// Profil akun customer dari `GET /provider/profile` (backend memakai tabel
/// yang sama untuk mitra dan customer, dibedakan oleh `role`).
class CustomerProfile {
  final int id;
  final String role;
  final String name;
  final String email;
  final String whatsapp;
  final String gender;
  final String birthDate;
  final String wishlistData;

  /// Path foto profil di backend; kosong bila belum ada.
  final String profilePhoto;

  const CustomerProfile({
    required this.id,
    required this.role,
    required this.name,
    required this.email,
    this.whatsapp = '',
    this.gender = '',
    this.birthDate = '',
    this.wishlistData = '',
    this.profilePhoto = '',
  });

  factory CustomerProfile.fromJson(Map<String, dynamic> json) {
    String s(String key) => json[key] is String ? json[key] as String : '';
    final picName = s('picName');
    return CustomerProfile(
      id: (json['id'] as num?)?.toInt() ?? 0,
      role: s('role'),
      name: picName.isNotEmpty ? picName : s('businessName'),
      email: s('email'),
      whatsapp: s('whatsapp'),
      gender: s('gender'),
      birthDate: s('birthDate'),
      wishlistData: s('wishlistData'),
      profilePhoto: s('profilePhoto'),
    );
  }

  bool get isCustomer => role == 'CUSTOMER';
}
