import React, { useState, useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { ArrowLeft, User, Mail, Phone, Calendar, Users, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';

interface Participant {
  nama: string;
  hp: string;
  gender: string;
  tanggalLahir: string;
  riwayatPenyakit: string;
}

export const CustomerBookingPage: React.FC = () => {
  const { navigateTo, selectedPackageForDetail, providerProfile, bookingFormData, setBookingFormData } = useNavigation();

  const currentPackageId = selectedPackageForDetail?.id;
  const activeFormData = (bookingFormData && String(bookingFormData.packageId) === String(currentPackageId)) ? bookingFormData : null;

  // Check if user is logged in
  const isLoggedIn = !!(providerProfile && providerProfile.email);

  // Data Pemesan State - initialize with priority: providerProfile (logged in) > activeFormData > defaults
  const [pemesanName, setPemesanName] = useState(() => 
    providerProfile?.picName || providerProfile?.businessName || activeFormData?.pemesan?.nama || ''
  );
  const [pemesanEmail, setPemesanEmail] = useState(() => 
    providerProfile?.email || activeFormData?.pemesan?.email || ''
  );
  const [pemesanPhone, setPemesanPhone] = useState(() => 
    providerProfile?.whatsapp || activeFormData?.pemesan?.whatsapp || ''
  );
  const [pemesanBirthDate, setPemesanBirthDate] = useState(() => activeFormData?.peserta?.[0]?.tanggalLahir || '1998-05-15');
  const [pemesanGender, setPemesanGender] = useState(() => activeFormData?.peserta?.[0]?.gender || 'Laki-laki');

  // Checkbox state: Peserta 1 sama dengan Pemesan
  const [isSameAsPemesan, setIsSameAsPemesan] = useState(() => {
    if (activeFormData?.peserta && activeFormData.peserta.length > 0) {
      const p0 = activeFormData.peserta[0];
      return p0.nama === activeFormData.pemesan.nama && p0.hp === activeFormData.pemesan.whatsapp;
    }
    return true; // Default to true so logged-in user details auto-populate Peserta 1!
  });

  // Data Peserta Dynamic State
  const guestsCount = selectedPackageForDetail?.bookingGuests || 1;
  const [participants, setParticipants] = useState<Participant[]>(() => {
    if (activeFormData?.peserta && activeFormData.peserta.length > 0) {
      return activeFormData.peserta.map(p => ({
        nama: p.nama || '',
        hp: p.hp || '',
        gender: p.gender || 'Laki-laki',
        tanggalLahir: p.tanggalLahir || '2000-01-01',
        riwayatPenyakit: p.riwayatPenyakit || 'Tidak Ada'
      }));
    }
    return [];
  });

  // Validation Error States
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Auto-fill fields if user is logged in (Google OAuth or customer account)
  useEffect(() => {
    if (providerProfile) {
      if (providerProfile.picName || providerProfile.businessName) {
        setPemesanName(providerProfile.picName || providerProfile.businessName || '');
      }
      if (providerProfile.email) {
        setPemesanEmail(providerProfile.email || '');
      }
      if (providerProfile.whatsapp) {
        setPemesanPhone(providerProfile.whatsapp || '');
      }
    }
  }, [providerProfile]);

  // Adjust participants array dynamically whenever guestsCount changes
  useEffect(() => {
    setParticipants((prev) => {
      const updated = [...prev];
      if (updated.length < guestsCount) {
        for (let i = updated.length; i < guestsCount; i++) {
          updated.push({
            nama: i === 0 && providerProfile && !bookingFormData ? (providerProfile.picName || '') : '',
            hp: i === 0 && providerProfile && !bookingFormData ? (providerProfile.whatsapp || '') : '',
            gender: 'Laki-laki',
            tanggalLahir: i === 0 ? pemesanBirthDate : '2000-01-01',
            riwayatPenyakit: 'Tidak Ada'
          });
        }
      } else if (updated.length > guestsCount) {
        return updated.slice(0, guestsCount);
      }
      return updated;
    });
  }, [guestsCount, providerProfile, bookingFormData]);

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
          riwayatPenyakit: prev[0]?.riwayatPenyakit || 'Tidak Ada'
        };
        return copy;
      });
    }
  }, [isSameAsPemesan, pemesanName, pemesanPhone, pemesanGender, pemesanBirthDate]);

  if (!selectedPackageForDetail) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', color: '#64748b' }}>
        <p>Tidak ada data pesanan aktif. Silakan pilih paket terlebih dahulu.</p>
        <button onClick={() => navigateTo('beranda')} style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  const pkg = selectedPackageForDetail;
  const selectedAddOns = pkg.selectedAddOns || [];
  const addOnsTotal = selectedAddOns.reduce((sum: number, a: any) => sum + (a.price || 0), 0);
  const totalCost = (pkg.price * guestsCount) + addOnsTotal;

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
      newErrors.pemesanName = 'Nama pemesan minimal 3 karakter.';
    } else if (!/^[a-zA-Z\s]+$/.test(pemesanName)) {
      newErrors.pemesanName = 'Nama hanya boleh berisi huruf dan spasi (tanpa angka/karakter khusus).';
    }

    // Validate Pemesan Email
    if (!pemesanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pemesanEmail)) {
      newErrors.pemesanEmail = 'Format email tidak valid (contoh: pemesan@gmail.com).';
    }

    // Validate Pemesan Phone
    if (!pemesanPhone || !/^(08|62)\d{8,12}$/.test(pemesanPhone)) {
      newErrors.pemesanPhone = 'Nomor HP pemesan harus diawali 08 atau 62 (10–14 digit angka).';
    }

    // Validate Pemesan Birthdate
    if (!pemesanBirthDate) {
      newErrors.pemesanBirthDate = 'Tanggal lahir wajib diisi.';
    } else if (new Date(pemesanBirthDate) > new Date()) {
      newErrors.pemesanBirthDate = 'Tanggal lahir tidak boleh berada di masa depan.';
    }

    // Validate Participants
    participants.forEach((p, idx) => {
      if (!p.nama || p.nama.trim().length < 3) {
        newErrors[`p_nama_${idx}`] = `Nama Peserta ${idx + 1} minimal 3 karakter.`;
      } else if (!/^[a-zA-Z\s]+$/.test(p.nama)) {
        newErrors[`p_nama_${idx}`] = `Nama Peserta ${idx + 1} hanya boleh berisi huruf.`;
      }

      if (!p.hp || !/^(08|62)\d{8,12}$/.test(p.hp)) {
        newErrors[`p_hp_${idx}`] = `Nomor HP Peserta ${idx + 1} harus diawali 08 atau 62 (10–14 digit angka).`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitData = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      alert('Terdapat data yang belum sesuai kriteria. Silakan periksa pesan peringatan di form.');
      return;
    }

    // Save into NavigationContext for Step 5 Confirmation
    setBookingFormData({
      packageId: currentPackageId,
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
          <ArrowLeft size={16} /> Kembali ke Detail Paket
        </button>

        <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', marginBottom: '30px' }}>
          Data Pemesan & Peserta Trip
        </h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '30px', alignItems: 'flex-start' }}>
          
          {/* Left Column: Form Pemesan & Peserta */}
          <form onSubmit={handleSubmitData} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* BAGIAN 1: DATA PEMESAN */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  1. Data Pemesan (Kontak Utama)
                </h2>
                {isLoggedIn && (
                  <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '700', backgroundColor: '#dcfce7', padding: '4px 10px', borderRadius: '30px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={13} /> Terisi Otomatis (Akun Anda)
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Nama Pemesan */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>
                    Nama Lengkap Pemesan <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', borderRadius: '10px', border: errors.pemesanName ? '1.5px solid #ef4444' : '1px solid #cbd5e1', padding: '0 14px', backgroundColor: '#ffffff' }}>
                    <User size={16} color="#94a3b8" style={{ flexShrink: 0, marginRight: '10px' }} />
                    <input 
                      type="text" 
                      placeholder="Masukkan nama pemesan (hanya huruf)..."
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
                    Alamat Email <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', borderRadius: '10px', border: errors.pemesanEmail ? '1.5px solid #ef4444' : '1px solid #cbd5e1', padding: '0 14px', backgroundColor: '#ffffff' }}>
                    <Mail size={16} color="#94a3b8" style={{ flexShrink: 0, marginRight: '10px' }} />
                    <input 
                      type="email" 
                      placeholder="Email untuk pengiriman tiket..."
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
                    Nomor WhatsApp / HP <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', borderRadius: '10px', border: errors.pemesanPhone ? '1.5px solid #ef4444' : '1px solid #cbd5e1', padding: '0 14px', backgroundColor: '#ffffff' }}>
                    <Phone size={16} color="#94a3b8" style={{ flexShrink: 0, marginRight: '10px' }} />
                    <input 
                      type="tel" 
                      placeholder="Contoh: 081234567890..."
                      value={pemesanPhone}
                      onChange={(e) => setPemesanPhone(e.target.value)}
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
                      Tanggal Lahir <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input 
                      type="date"
                      value={pemesanBirthDate}
                      onChange={(e) => setPemesanBirthDate(e.target.value)}
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
                      Jenis Kelamin <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      value={pemesanGender}
                      onChange={(e) => setPemesanGender(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '14px',
                        outline: 'none',
                        color: '#0f172a',
                        backgroundColor: '#ffffff',
                        cursor: 'pointer',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </div>
                </div>

              </div>
            </div>

            {/* BAGIAN 2: DATA PESERTA (BERJUMLAH SESUAI JUMLAH PESERTA) */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>
                2. Data Peserta Trip ({guestsCount} Orang)
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px 0' }}>
                Lengkapi nama, nomor HP, dan jenis kelamin seluruh peserta yang akan berangkat.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {participants.map((p, idx) => (
                  <div key={idx} style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#007bff', margin: 0 }}>
                        Peserta {idx + 1}
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
                          <span>Peserta 1 sama dengan Pemesan</span>
                        </label>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                          Nama Lengkap Peserta <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input 
                          type="text"
                          placeholder={`Nama peserta ${idx + 1}...`}
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
                          Nomor HP Peserta <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input 
                          type="tel"
                          placeholder="Nomor HP..."
                          value={p.hp}
                          onChange={(e) => handleParticipantChange(idx, 'hp', e.target.value)}
                          readOnly={idx === 0 && isSameAsPemesan}
                          required
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: errors[`p_hp_${idx}`] ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                            fontSize: '13px',
                            outline: 'none',
                            backgroundColor: idx === 0 && isSameAsPemesan ? '#f1f5f9' : '#ffffff',
                            color: '#0f172a',
                            boxSizing: 'border-box'
                          }}
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
                          Jenis Kelamin <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <select
                          value={p.gender}
                          onChange={(e) => handleParticipantChange(idx, 'gender', e.target.value)}
                          disabled={idx === 0 && isSameAsPemesan}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '13px',
                            outline: 'none',
                            color: '#0f172a',
                            backgroundColor: idx === 0 && isSameAsPemesan ? '#f1f5f9' : '#ffffff',
                            cursor: idx === 0 && isSameAsPemesan ? 'not-allowed' : 'pointer',
                            boxSizing: 'border-box'
                          }}
                        >
                          <option value="Laki-laki">Laki-laki</option>
                          <option value="Perempuan">Perempuan</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                          Tanggal Lahir Peserta <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input 
                          type="date"
                          value={p.tanggalLahir || '2000-01-01'}
                          onChange={(e) => handleParticipantChange(idx, 'tanggalLahir', e.target.value)}
                          disabled={idx === 0 && isSameAsPemesan}
                          required
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '13px',
                            outline: 'none',
                            color: '#0f172a',
                            backgroundColor: idx === 0 && isSameAsPemesan ? '#f1f5f9' : '#ffffff',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: '12px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                        Riwayat Penyakit & Alergi <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '400' }}>(Maks. 255 Karakter, opsional)</span>
                      </label>
                      <input 
                        type="text"
                        maxLength={255}
                        placeholder="Misal: Asma, Alergi Sehat, Jantung, atau '-' jika tidak ada"
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
              Lanjut ke Konfirmasi Pemesanan
            </button>
          </form>

          {/* Right Column: Trip Summary Card */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', position: 'sticky', top: '90px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: '0 0 16px 0', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
              Rincian Pemesanan
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
                <span>22–25 Mei 2026</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#475569' }}>
                <Users size={15} color="#94a3b8" />
                <span>{guestsCount} Peserta</span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b' }}>
                <span>Harga ({guestsCount}x)</span>
                <span>{formatIDR(pkg.price * guestsCount)}</span>
              </div>

              {selectedAddOns.map((addon: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#007bff' }}>
                  <span>Add-On: {addon.name}</span>
                  <span style={{ fontWeight: '600' }}>+{formatIDR(addon.price)}</span>
                </div>
              ))}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '800', color: '#0f172a', borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '4px' }}>
                <span>Total Pembayaran</span>
                <span>{formatIDR(totalCost)}</span>
              </div>
            </div>

            <div style={{ marginTop: '20px', backgroundColor: '#fffbeb', border: '1px solid #fef3c7', padding: '12px', borderRadius: '8px', display: 'flex', gap: '8px', fontSize: '12px', color: '#b45309' }}>
              <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>
                Data peserta yang diisi akan digunakan oleh mitra travel untuk asuransi dan pendaftaran.
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
