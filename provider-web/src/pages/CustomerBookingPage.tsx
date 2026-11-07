import { formatTripRange, tripEndDate, validDate } from '../utils/tripDates';
import React, { useState, useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { useCustomAlert } from '../components/CustomAlertModal';
import { ArrowLeft, User, Mail, Calendar, Users, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';
import { IndonesianPhoneInput } from '../components/IndonesianPhoneInput';
import { isValidIndonesianMobilePhone, normalizeIndonesianPhone } from '../utils/phone';
import {
  getMeetingPointAddress,
  getMeetingPointCoordinates,
  MeetingPointMap,
} from '../components/MeetingPointMap';
import { fetchCheckoutConfig } from '../utils/checkoutConfig';
import { FlexiblePickupDetails, ParticipantPickupInput } from '../components/TripPickup';
import { addOnSubtotal, basePrice, isPerUnit, unitName, unitsFor, type PackageAddOn } from '../utils/pricing';
import { useI18n } from '../i18n';

// Tanggal hari ini (zona waktu lokal) dalam format YYYY-MM-DD untuk validasi tanggal lahir
const getTodayIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const parseIsoDateParts = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return { year, month, day };
};

const ageOnDate = (birthDate: string, tripDate: string) => {
  const birth = parseIsoDateParts(birthDate);
  const trip = parseIsoDateParts(tripDate);
  if (!birth || !trip) return null;
  let age = trip.year - birth.year;
  if (trip.month < birth.month || (trip.month === birth.month && trip.day < birth.day)) age -= 1;
  return age;
};

// Mengembalikan pesan error tanggal lahir, termasuk batas usia paket bila
// tanggal perjalanan sudah dipilih.
const getBirthDateError = (t: (id: string, en: string) => string, value: string, label: string, tripDate = '', minAge = 0, maxAge = 0) => {
  if (!value) return t(`Tanggal lahir ${label} wajib diisi.`, `${label} date of birth is required.`);
  if (!parseIsoDateParts(value) || value < '1900-01-01') {
    return t(`Tanggal lahir ${label} tidak valid.`, `${label} date of birth is not valid.`);
  }
  if (value > getTodayIso()) return t(`Tanggal lahir ${label} tidak boleh berada di masa depan.`, `${label} date of birth cannot be in the future.`);
  const age = ageOnDate(value, tripDate);
  if (age !== null && minAge > 0 && age < minAge) {
    return t(`${label} berusia ${age} tahun saat trip; usia minimum paket ${minAge} tahun.`, `${label} will be ${age} on the trip date; the minimum age for this package is ${minAge}.`);
  }
  if (age !== null && maxAge > 0 && age > maxAge) {
    return t(`${label} berusia ${age} tahun saat trip; usia maksimum paket ${maxAge} tahun.`, `${label} will be ${age} on the trip date; the maximum age for this package is ${maxAge}.`);
  }
  return '';
};

interface Participant {
  pickupPoint: string;
  nama: string;
  hp: string;
  gender: string;
  tanggalLahir: string;
  riwayatPenyakit: string;
}

export const CustomerBookingPage: React.FC = () => {
  const { navigateTo, selectedPackageForDetail, customerProfile, setBookingFormData, bookingFormData, openAuthModal } = useNavigation();
  const { showAlert } = useCustomAlert();
  const { t, locale } = useI18n();
  // Biaya layanan dari backend agar total di sini sama dengan tagihan akhir.
  const [serviceFee, setServiceFee] = useState<number | null>(null);
  useEffect(() => {
    fetchCheckoutConfig().then((cfg) => setServiceFee(cfg.serviceFee)).catch(() => setServiceFee(null));
  }, []);

  const currentPackageId = selectedPackageForDetail?.id;
  const activeFormData = (bookingFormData && String(bookingFormData.packageId) === String(currentPackageId)) ? bookingFormData : null;

  // Check if user is logged in
  const isLoggedIn = !!(customerProfile && customerProfile.email);

  useEffect(() => {
    if (!customerProfile) {
      openAuthModal('login');
    }
  }, [customerProfile]);

  // Data Pemesan State - initialize with priority: customerProfile (logged in) > activeFormData > defaults
  const [pemesanName, setPemesanName] = useState(() => 
    customerProfile?.picName || customerProfile?.businessName || activeFormData?.pemesan?.nama || ''
  );
  const [pemesanEmail, setPemesanEmail] = useState(() => 
    customerProfile?.email || activeFormData?.pemesan?.email || ''
  );
  const [pemesanPhone, setPemesanPhone] = useState(() => 
    normalizeIndonesianPhone(customerProfile?.whatsapp || activeFormData?.pemesan?.whatsapp || '')
  );
  const [pemesanBirthDate, setPemesanBirthDate] = useState(() => customerProfile?.birthDate || activeFormData?.peserta?.[0]?.tanggalLahir || '');
  const [pemesanGender, setPemesanGender] = useState(() => customerProfile?.gender || activeFormData?.peserta?.[0]?.gender || '');

  // Checkbox state: Peserta 1 sama dengan Pemesan (Do NOT auto-check!)
  const [isSameAsPemesan, setIsSameAsPemesan] = useState(() => {
    if (activeFormData?.peserta && activeFormData.peserta.length > 0) {
      const p0 = activeFormData.peserta[0];
      return p0.nama === activeFormData.pemesan.nama && p0.hp === activeFormData.pemesan.whatsapp;
    }
    return false; // Do NOT auto-check by default!
  });

  // Data Peserta Dynamic State
  const guestsCount = selectedPackageForDetail?.bookingGuests || 1;
  const [participants, setParticipants] = useState<Participant[]>(() => {
    if (activeFormData?.peserta && activeFormData.peserta.length > 0) {
      return activeFormData.peserta.map(p => ({
        nama: p.nama || '',
        hp: normalizeIndonesianPhone(p.hp || ''),
        gender: p.gender || '',
        tanggalLahir: p.tanggalLahir || '',
        riwayatPenyakit: p.riwayatPenyakit || '',
        pickupPoint: p.pickupPoint || ''
      }));
    }
    return [];
  });

  // Validation Error States
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Auto-fill fields if user is logged in (Google OAuth or customer account)
  useEffect(() => {
    if (customerProfile) {
      if (customerProfile.picName || customerProfile.businessName) {
        setPemesanName(customerProfile.picName || customerProfile.businessName || '');
      }
      if (customerProfile.email) {
        setPemesanEmail(customerProfile.email || '');
      }
      if (customerProfile.whatsapp) {
        setPemesanPhone(normalizeIndonesianPhone(customerProfile.whatsapp || ''));
      }
      if (customerProfile.birthDate) {
        setPemesanBirthDate(customerProfile.birthDate);
      }
      if (customerProfile.gender) {
        setPemesanGender(customerProfile.gender);
      }
    }
  }, [customerProfile]);

  // Adjust participants array dynamically whenever guestsCount changes
  useEffect(() => {
    setParticipants((prev) => {
      const updated = [...prev];
      if (updated.length < guestsCount) {
        for (let i = updated.length; i < guestsCount; i++) {
          const isFirst = (i === 0);
          updated.push({
            nama: isFirst && customerProfile ? (customerProfile.picName || customerProfile.businessName || '') : '',
            hp: isFirst && customerProfile ? normalizeIndonesianPhone(customerProfile.whatsapp || '') : '',
            gender: isFirst && customerProfile ? (customerProfile.gender || '') : '',
            tanggalLahir: isFirst && customerProfile ? (customerProfile.birthDate || '') : '',
            riwayatPenyakit: '',
            pickupPoint: ''
          });
        }
      } else if (updated.length > guestsCount) {
        return updated.slice(0, guestsCount);
      }
      return updated;
    });
  }, [guestsCount, bookingFormData, customerProfile]);

  // Sync Peserta 1 with Pemesan when checkbox is toggled or when pemesan data changes
  useEffect(() => {
    if (isSameAsPemesan && participants.length > 0) {
      setParticipants((prev) => {
        const copy = [...prev];
        copy[0] = {
          nama: pemesanName,
          hp: pemesanPhone,
          gender: pemesanGender,
          tanggalLahir: pemesanBirthDate,
          riwayatPenyakit: prev[0]?.riwayatPenyakit || '',
          pickupPoint: prev[0]?.pickupPoint || ''
        };
        return copy;
      });
    }
  }, [isSameAsPemesan, pemesanName, pemesanPhone, pemesanGender, pemesanBirthDate]);

  if (!selectedPackageForDetail) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', color: '#64748b' }}>
        <p>{t('Tidak ada data pesanan aktif. Silakan pilih paket terlebih dahulu.', 'No active booking found. Please choose a package first.')}</p>
        <button onClick={() => navigateTo('beranda')} style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          {t('Kembali ke Beranda', 'Back to Home')}
        </button>
      </div>
    );
  }

  const pkg = selectedPackageForDetail;
  const isOpenTrip = !pkg.tripType || pkg.tripType === 'Open Trip';
  const selectedTripDate = isOpenTrip ? (pkg.bookingDate || (parseIsoDateParts(pkg.schedule || '') ? pkg.schedule : '')) : (validDate(pkg.bookingDate) ? pkg.bookingDate : '');
  const packageMinAge = Number(pkg.minAge) > 0 ? Number(pkg.minAge) : 0;
  const packageMaxAge = Number(pkg.maxAge) > 0 ? Number(pkg.maxAge) : 0;
  const meetingPointCoordinates = getMeetingPointCoordinates(pkg);
  const meetingPointAddress = getMeetingPointAddress(pkg);
  // Subtotal add-on per orang dihitung ulang dari jumlah peserta saat ini.
  const selectedAddOns = ((pkg.selectedAddOns || []) as PackageAddOn[]).map((a) => ({ ...a, subtotal: addOnSubtotal(a, guestsCount) }));
  const addOnsTotal = selectedAddOns.reduce((sum, a) => sum + a.subtotal, 0);
  const perUnit = isPerUnit(pkg);
  const unitCount = unitsFor(pkg, guestsCount);
  const baseCost = basePrice(pkg, guestsCount);
  const totalCost = baseCost + addOnsTotal + (serviceFee || 0);

  const formatIDR = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const handleParticipantChange = (index: number, field: keyof Participant, value: string) => {
    setParticipants((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Validation functions
  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    // Validate Pemesan Name
    if (!pemesanName || pemesanName.trim().length < 3) {
      newErrors.pemesanName = t('Nama pemesan minimal 3 karakter.', 'Booker name must be at least 3 characters.');
    } else if (!/^[a-zA-Z\s]+$/.test(pemesanName)) {
      newErrors.pemesanName = t('Nama hanya boleh berisi huruf dan spasi (tanpa angka/karakter khusus).', 'Name can only contain letters and spaces (no numbers or symbols).');
    }

    // Validate Pemesan Email
    if (!pemesanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pemesanEmail)) {
      newErrors.pemesanEmail = t('Format email tidak valid (contoh: pemesan@gmail.com).', 'Invalid email format (example: name@gmail.com).');
    }

    // Validate Pemesan Phone
    if (!isValidIndonesianMobilePhone(pemesanPhone)) {
      newErrors.pemesanPhone = t('Masukkan 9–12 digit nomor pemesan setelah +62, diawali angka 8.', "Enter the booker's 9–12 digit number after +62, starting with 8.");
    }

    // Validate Pemesan Birthdate
    const pemesanBirthDateError = getBirthDateError(t, pemesanBirthDate, t('pemesan', 'Booker'));
    if (pemesanBirthDateError) {
      newErrors.pemesanBirthDate = pemesanBirthDateError;
    }

    // Validate Pemesan Gender
    if (pemesanGender !== 'Laki-laki' && pemesanGender !== 'Perempuan') {
      newErrors.pemesanGender = t('Jenis kelamin pemesan wajib dipilih.', "Please select the booker's gender.");
    }

    // Validate Participants
    participants.forEach((p, idx) => {
      if (pkg.pickupMode === 'FLEXIBLE' && (p.pickupPoint.trim().length < 5 || p.pickupPoint.trim().length > 500)) {
        newErrors[`p_pickup_${idx}`] = t('Isi titik jemput 5–500 karakter, dengan alamat atau patokan yang jelas.', 'Enter a pickup point of 5–500 characters with a clear address or landmark.');
      }
      if (!p.nama || p.nama.trim().length < 3) {
        newErrors[`p_nama_${idx}`] = t(`Nama Peserta ${idx + 1} minimal 3 karakter.`, `Participant ${idx + 1} name must be at least 3 characters.`);
      } else if (!/^[a-zA-Z\s]+$/.test(p.nama)) {
        newErrors[`p_nama_${idx}`] = t(`Nama Peserta ${idx + 1} hanya boleh berisi huruf.`, `Participant ${idx + 1} name can only contain letters.`);
      }

      if (!isValidIndonesianMobilePhone(p.hp)) {
        newErrors[`p_hp_${idx}`] = t(`Masukkan 9–12 digit nomor Peserta ${idx + 1} setelah +62.`, `Enter Participant ${idx + 1}'s 9–12 digit number after +62.`);
      }

      if (p.gender !== 'Laki-laki' && p.gender !== 'Perempuan') {
        newErrors[`p_gender_${idx}`] = t(`Jenis kelamin Peserta ${idx + 1} wajib dipilih.`, `Please select Participant ${idx + 1}'s gender.`);
      }

      const birthDateError = getBirthDateError(
        t,
        p.tanggalLahir,
        t(`Peserta ${idx + 1}`, `Participant ${idx + 1}`),
        selectedTripDate,
        packageMinAge,
        packageMaxAge,
      );
      if (birthDateError) {
        newErrors[`p_tanggalLahir_${idx}`] = birthDateError;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitData = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showAlert({ type: 'warning', title: t('Periksa Form', 'Check the Form'), message: t('Terdapat data yang belum sesuai kriteria. Silakan periksa pesan peringatan di form.', "Some details don't meet the requirements. Please check the warnings in the form.") });
      return;
    }

    if (!validDate(selectedTripDate)) {
      showAlert({type: 'warning', title: t('Pilih Tanggal', 'Choose a Date'), message: t('Kembali ke detail paket dan pilih tanggal pada kalender.', 'Go back to the package details and pick a date on the calendar.')});
      return;
    }
    // Save into NavigationContext for Step 5 Confirmation
    setBookingFormData({
      packageId: currentPackageId,
      tripDate: selectedTripDate,
      tripEndDate: pkg.bookingEndDate || tripEndDate(selectedTripDate, pkg.duration),
      pemesan: {
        nama: pemesanName,
        email: pemesanEmail,
        whatsapp: pemesanPhone
      },
      peserta: participants,
      selectedAddOns: selectedAddOns
    });

    navigateTo('customer-confirmation');
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', paddingBottom: '80px', paddingTop: '24px', fontFamily: 'Inter, sans-serif' }}>
      <div className="container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* Back Link */}
        <button 
          onClick={() => navigateTo('paket-detail')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            fontSize: '14px',
            fontWeight: '600',
            color: '#475569',
            cursor: 'pointer',
            marginBottom: '24px'
          }}
        >
          <ArrowLeft size={16} /> {t('Kembali ke Detail Paket', 'Back to Package Details')}
        </button>

        <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', marginBottom: '30px' }}>
          {t('Data Pemesan & Peserta Trip', 'Booker & Participant Details')}
        </h1>

        <div className="trip-checkout-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: '30px', alignItems: 'flex-start' }}>
          
          {/* Left Column: Form Pemesan & Peserta */}
          <form onSubmit={handleSubmitData} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* BAGIAN 1: DATA PEMESAN */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  {t('1. Data Pemesan (Kontak Utama)', '1. Booker Details (Main Contact)')}
                </h2>
                {isLoggedIn && (
                  <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '700', backgroundColor: '#dcfce7', padding: '4px 10px', borderRadius: '30px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={13} /> {t('Terisi Otomatis (Akun Anda)', 'Auto-filled (Your Account)')}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Nama Pemesan */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>
                    {t('Nama Lengkap Pemesan', 'Booker Full Name')} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', borderRadius: '10px', border: errors.pemesanName ? '1.5px solid #ef4444' : '1px solid #cbd5e1', padding: '0 14px', backgroundColor: '#ffffff' }}>
                    <User size={16} color="#94a3b8" style={{ flexShrink: 0, marginRight: '10px' }} />
                    <input 
                      type="text" 
                      placeholder={t('Masukkan nama pemesan (hanya huruf)...', 'Enter booker name (letters only)...')}
                      value={pemesanName}
                      onChange={(e) => setPemesanName(e.target.value)}
                      required
                      style={{
                        flex: 1,
                        width: '100%',
                        padding: '12px 0',
                        border: 'none',
                        outline: 'none',
                        fontSize: '14px',
                        color: '#0f172a',
                        backgroundColor: 'transparent',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  {errors.pemesanName && (
                    <span style={{ fontSize: '11.5px', color: '#ef4444', fontWeight: '700', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertCircle size={13} /> {errors.pemesanName}
                    </span>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>
                    {t('Alamat Email', 'Email Address')} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', borderRadius: '10px', border: errors.pemesanEmail ? '1.5px solid #ef4444' : '1px solid #cbd5e1', padding: '0 14px', backgroundColor: '#ffffff' }}>
                    <Mail size={16} color="#94a3b8" style={{ flexShrink: 0, marginRight: '10px' }} />
                    <input 
                      type="email" 
                      placeholder={t('Email untuk pengiriman tiket...', 'Email for your e-ticket...')}
                      value={pemesanEmail}
                      onChange={(e) => setPemesanEmail(e.target.value)}
                      required
                      style={{
                        flex: 1,
                        width: '100%',
                        padding: '12px 0',
                        border: 'none',
                        outline: 'none',
                        fontSize: '14px',
                        color: '#0f172a',
                        backgroundColor: 'transparent',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  {errors.pemesanEmail && (
                    <span style={{ fontSize: '11.5px', color: '#ef4444', fontWeight: '700', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertCircle size={13} /> {errors.pemesanEmail}
                    </span>
                  )}
                </div>

                {/* WhatsApp */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>
                    {t('Nomor WhatsApp / HP', 'WhatsApp / Phone Number')} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <IndonesianPhoneInput
                    value={pemesanPhone}
                    onChange={setPemesanPhone}
                    invalid={Boolean(errors.pemesanPhone)}
                    required
                  />
                  {errors.pemesanPhone && (
                    <span style={{ fontSize: '11.5px', color: '#ef4444', fontWeight: '700', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertCircle size={13} /> {errors.pemesanPhone}
                    </span>
                  )}
                </div>

                {/* Tanggal Lahir & Jenis Kelamin Dropdown */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>
                      {t('Tanggal Lahir', 'Date of Birth')} <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input 
                      type="date"
                      value={pemesanBirthDate}
                      onChange={(e) => setPemesanBirthDate(e.target.value)}
                      min="1900-01-01"
                      max={getTodayIso()}
                      required
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: errors.pemesanBirthDate ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                        fontSize: '14px',
                        outline: 'none',
                        color: '#0f172a',
                        backgroundColor: '#ffffff',
                        cursor: 'pointer',
                        boxSizing: 'border-box'
                      }}
                    />
                    {errors.pemesanBirthDate && (
                      <span style={{ fontSize: '11.5px', color: '#ef4444', fontWeight: '700', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertCircle size={13} /> {errors.pemesanBirthDate}
                      </span>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>
                      {t('Jenis Kelamin', 'Gender')} <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      value={pemesanGender}
                      onChange={(e) => setPemesanGender(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: errors.pemesanGender ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                        fontSize: '14px',
                        outline: 'none',
                        color: '#0f172a',
                        backgroundColor: '#ffffff',
                        cursor: 'pointer',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="">{t('Pilih', 'Select')}</option>
                      <option value="Laki-laki">{t('Laki-laki', 'Male')}</option>
                      <option value="Perempuan">{t('Perempuan', 'Female')}</option>
                    </select>
                    {errors.pemesanGender && (
                      <span style={{ fontSize: '11.5px', color: '#ef4444', fontWeight: '700', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertCircle size={13} /> {errors.pemesanGender}
                      </span>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* BAGIAN 2: DATA PESERTA (BERJUMLAH SESUAI JUMLAH PESERTA) */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>
                {t(`2. Data Peserta Trip (${guestsCount} Orang)`, `2. Participant Details (${guestsCount} ${guestsCount === 1 ? 'Person' : 'People'})`)}
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px 0' }}>
                {t('Lengkapi nama, nomor HP, dan jenis kelamin seluruh peserta yang akan berangkat.', 'Fill in the name, phone number, and gender of every participant joining the trip.')}
                {(packageMinAge > 0 || packageMaxAge > 0) && (
                  <span style={{ display: 'block', marginTop: 6, color: '#b45309', fontWeight: 700 }}>
                    {t('Batas usia saat tanggal perjalanan', 'Age limit on the trip date')}: {packageMinAge > 0 ? t(`${packageMinAge} tahun`, `${packageMinAge} years`) : t('tanpa minimum', 'no minimum')}–{packageMaxAge > 0 ? t(`${packageMaxAge} tahun`, `${packageMaxAge} years`) : t('tanpa maksimum', 'no maximum')}.
                  </span>
                )}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {participants.map((p, idx) => (
                  <div key={idx} style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#007bff', margin: 0 }}>
                        {t('Peserta', 'Participant')} {idx + 1}
                      </h3>

                      {/* Checkbox Opsi Peserta 1 Sama Dengan Pemesan */}
                      {idx === 0 && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '700', color: '#0f172a', cursor: 'pointer', backgroundColor: '#ffffff', padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                          <input 
                            type="checkbox"
                            checked={isSameAsPemesan}
                            onChange={(e) => setIsSameAsPemesan(e.target.checked)}
                            style={{ accentColor: '#007bff', width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                          <span>{t('Peserta 1 sama dengan Pemesan', 'Participant 1 is the booker')}</span>
                        </label>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                          {t('Nama Lengkap Peserta', 'Participant Full Name')} <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input 
                          type="text"
                          placeholder={t(`Nama peserta ${idx + 1}...`, `Participant ${idx + 1} name...`)}
                          value={p.nama}
                          onChange={(e) => handleParticipantChange(idx, 'nama', e.target.value)}
                          readOnly={idx === 0 && isSameAsPemesan}
                          required
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: errors[`p_nama_${idx}`] ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                            fontSize: '13px',
                            outline: 'none',
                            backgroundColor: idx === 0 && isSameAsPemesan ? '#f1f5f9' : '#ffffff',
                            color: '#0f172a',
                            boxSizing: 'border-box'
                          }}
                        />
                        {errors[`p_nama_${idx}`] && (
                          <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: '700', marginTop: '3px', display: 'block' }}>
                            {errors[`p_nama_${idx}`]}
                          </span>
                        )}
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                          {t('Nomor HP Peserta', 'Participant Phone')} <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <IndonesianPhoneInput
                          value={p.hp}
                          onChange={(value) => handleParticipantChange(idx, 'hp', value)}
                          invalid={Boolean(errors[`p_hp_${idx}`])}
                          readOnly={idx === 0 && isSameAsPemesan}
                          required
                          compact
                          ariaLabel={t(`Nomor HP Peserta ${idx + 1} tanpa kode negara`, `Participant ${idx + 1} phone number without country code`)}
                        />
                        {errors[`p_hp_${idx}`] && (
                          <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: '700', marginTop: '3px', display: 'block' }}>
                            {errors[`p_hp_${idx}`]}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                          {t('Jenis Kelamin', 'Gender')} <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <select
                          value={p.gender}
                          onChange={(e) => handleParticipantChange(idx, 'gender', e.target.value)}
                          disabled={idx === 0 && isSameAsPemesan}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: errors[`p_gender_${idx}`] ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                            fontSize: '13px',
                            outline: 'none',
                            color: '#0f172a',
                            backgroundColor: idx === 0 && isSameAsPemesan ? '#f1f5f9' : '#ffffff',
                            cursor: idx === 0 && isSameAsPemesan ? 'not-allowed' : 'pointer',
                            boxSizing: 'border-box'
                          }}
                        >
                          <option value="">{t('Pilih', 'Select')}</option>
                          <option value="Laki-laki">{t('Laki-laki', 'Male')}</option>
                          <option value="Perempuan">{t('Perempuan', 'Female')}</option>
                        </select>
                        {errors[`p_gender_${idx}`] && (
                          <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: '700', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <AlertCircle size={12} /> {errors[`p_gender_${idx}`]}
                          </span>
                        )}
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                          {t('Tanggal Lahir Peserta', 'Participant Date of Birth')} <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input 
                          type="date"
                          value={p.tanggalLahir || ''}
                          onChange={(e) => handleParticipantChange(idx, 'tanggalLahir', e.target.value)}
                          disabled={idx === 0 && isSameAsPemesan}
                          min="1900-01-01"
                          max={getTodayIso()}
                          required
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: errors[`p_tanggalLahir_${idx}`] ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                            fontSize: '13px',
                            outline: 'none',
                            color: '#0f172a',
                            backgroundColor: idx === 0 && isSameAsPemesan ? '#f1f5f9' : '#ffffff',
                            boxSizing: 'border-box'
                          }}
                        />
                        {errors[`p_tanggalLahir_${idx}`] && (
                          <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: '700', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <AlertCircle size={12} /> {errors[`p_tanggalLahir_${idx}`]}
                          </span>
                        )}
                      </div>
                    </div>

                    {pkg.pickupMode === 'FLEXIBLE' && <ParticipantPickupInput id={`pickup-${idx}`} value={p.pickupPoint} points={pkg.pickupPoints || []}
                      onChange={value => handleParticipantChange(idx, 'pickupPoint', value)} error={errors[`p_pickup_${idx}`]}
                      previous={idx > 0 ? participants[0]?.pickupPoint : undefined} onCopy={() => handleParticipantChange(idx, 'pickupPoint', participants[0]?.pickupPoint || '')} />}
                    <div style={{ marginTop: '12px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                        {t('Riwayat Penyakit & Alergi', 'Medical History & Allergies')} <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '400' }}>{t('(Maks. 255 Karakter, opsional)', '(Max. 255 characters, optional)')}</span>
                      </label>
                      <input 
                        type="text"
                        maxLength={255}
                        placeholder={t("Misal: Asma, Alergi Sehat, Jantung, atau '-' jika tidak ada", "E.g. asthma, allergies, heart condition, or '-' if none")}
                        value={p.riwayatPenyakit || ''}
                        onChange={(e) => handleParticipantChange(idx, 'riwayatPenyakit', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '13px',
                          outline: 'none',
                          color: '#0f172a',
                          backgroundColor: '#ffffff',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#007bff',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(0, 123, 255, 0.25)'
              }}
            >
              {t('Lanjut ke Konfirmasi Pemesanan', 'Continue to Booking Confirmation')}
            </button>
          </form>

          {/* Right Column: Trip Summary Card */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', position: 'sticky', top: '90px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: '0 0 16px 0', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
              {t('Rincian Pemesanan', 'Booking Summary')}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <span style={{ fontSize: '11px', color: '#007bff', fontWeight: '700', textTransform: 'uppercase' }}>
                {pkg.category}
              </span>
              <strong style={{ fontSize: '15px', color: '#0f172a', display: 'block', lineHeight: '1.4' }}>
                {pkg.name}
              </strong>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#475569' }}>
                <Calendar size={15} color="#94a3b8" />
                <span>{formatTripRange(selectedTripDate, pkg.bookingEndDate || tripEndDate(selectedTripDate, pkg.duration), locale)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#475569' }}>
                <Users size={15} color="#94a3b8" />
                <span>{guestsCount} {t('Peserta', guestsCount === 1 ? 'Participant' : 'Participants')}</span>
              </div>
            </div>

            <FlexiblePickupDetails pkg={pkg} />
            {(meetingPointCoordinates || meetingPointAddress) && (
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', marginBottom: '18px' }}>
                <strong style={{ display: 'block', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>{t('Titik Kumpul', 'Meeting Point')}</strong>
                {meetingPointAddress && (
                  <span style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '10px', lineHeight: 1.5 }}>
                    {meetingPointAddress}
                  </span>
                )}
                {meetingPointCoordinates && <MeetingPointMap position={meetingPointCoordinates} height={180} zoom={15} />}
              </div>
            )}

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '13px', color: '#64748b' }}>
                <span>{perUnit ? `${unitCount} ${unitName(pkg)} × ${formatIDR(pkg.price)}` : `${formatIDR(pkg.price)} × ${guestsCount} ${t('orang', guestsCount === 1 ? 'person' : 'people')}`}</span>
                <span>{formatIDR(baseCost)}</span>
              </div>
              {perUnit && (
                <span style={{ fontSize: '11.5px', color: '#64748b', marginTop: '-4px' }}>
                  ≈ {formatIDR(Math.round(baseCost / Math.max(1, guestsCount)))} {t(`/ orang untuk ${guestsCount} peserta`, `/ person for ${guestsCount} ${guestsCount === 1 ? 'participant' : 'participants'}`)}
                </span>
              )}

              {selectedAddOns.map((addon) => (
                <div key={addon.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '13px', color: '#007bff' }}>
                  <span>Add-On: {addon.name}{addon.perPerson ? ` (${guestsCount}x)` : ''}</span>
                  <span style={{ fontWeight: '600' }}>+{formatIDR(addon.subtotal)}</span>
                </div>
              ))}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b' }}>
                <span>{t('Biaya layanan', 'Service fee')}</span>
                <span>{serviceFee === null ? t('dihitung di langkah berikutnya', 'calculated in the next step') : formatIDR(serviceFee)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '800', color: '#0f172a', borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '4px' }}>
                <span>{serviceFee === null ? 'Subtotal' : t('Total Pembayaran', 'Total Payment')}</span>
                <span>{formatIDR(totalCost)}</span>
              </div>
            </div>

            <div style={{ marginTop: '20px', backgroundColor: '#fffbeb', border: '1px solid #fef3c7', padding: '12px', borderRadius: '8px', display: 'flex', gap: '8px', fontSize: '12px', color: '#b45309' }}>
              <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>
                {t('Data peserta yang diisi akan digunakan oleh mitra travel untuk asuransi dan pendaftaran.', 'Participant details will be used by the travel partner for insurance and registration.')}
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
