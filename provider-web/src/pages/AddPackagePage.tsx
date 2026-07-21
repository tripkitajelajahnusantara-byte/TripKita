import React, { useState } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { Sidebar } from '../components/Sidebar';
import { 
  ArrowLeft, 
  Eye, 
  Save, 
  Send, 
  Sparkles,
  MapPin,
  Trash2,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  UploadCloud
} from 'lucide-react';

import { request } from '../utils/api';

export const AddPackagePage: React.FC = () => {
  const { navigateTo, editingPackageId } = useNavigation();
  const [activeStep, setActiveStep] = useState<'info' | 'itinerary' | 'facilities' | 'pricing' | 'photos'>('info');

  // Form states
  const [packageName, setPackageName] = useState('');
  const [category, setCategory] = useState('diving');
  const [duration, setDuration] = useState('5');
  const [location, setLocation] = useState('');
  const [meetPoint, setMeetPoint] = useState('');
  const [description, setDescription] = useState('');
  const [minGuests, setMinGuests] = useState('2');
  const [maxGuests, setMaxGuests] = useState('12');
  const [minAge, setMinAge] = useState('10');
  const [maxAge, setMaxAge] = useState('65');

  // New fields mapping to backend
  const [price, setPrice] = useState('');
  const [quotaMax, setQuotaMax] = useState('');
  const [schedule, setSchedule] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Itinerary states
  const [itineraries, setItineraries] = useState<{ day: number; activities: { time: string; title: string }[] }[]>([
    { day: 1, activities: [{ time: '08:00 - 10:00', title: 'Penjemputan di Meeting Point' }, { time: '12:00 - 13:00', title: 'Makan Siang' }] }
  ]);
  const [newActivityTime, setNewActivityTime] = useState('');
  const [newActivityTitle, setNewActivityTitle] = useState('');
  const [selectedItineraryDay, setSelectedItineraryDay] = useState(1);

  // Facilities states
  const [includedFacilities, setIncludedFacilities] = useState<string[]>([
    'Transportasi AC AC/PP',
    'Makan sesuai program',
    'Tiket masuk objek wisata',
    'Pemandu wisata profesional'
  ]);
  const [excludedFacilities, setExcludedFacilities] = useState<string[]>([
    'Pengeluaran pribadi',
    'Tiket penerbangan ke meeting point',
    'Tipping guide & driver'
  ]);
  const [newIncludedFacility, setNewIncludedFacility] = useState('');
  const [newExcludedFacility, setNewExcludedFacility] = useState('');

  // Photos states
  const [packagePhotos, setPackagePhotos] = useState<string[]>([
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=400&q=80'
  ]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const steps = [
    { id: 'info', label: 'Info Dasar' },
    { id: 'itinerary', label: 'Itinerary' },
    { id: 'facilities', label: 'Fasilitas' },
    { id: 'pricing', label: 'Jadwal & Harga' },
    { id: 'photos', label: 'Foto' },
  ] as const;

  React.useEffect(() => {
    async function loadPackage() {
      if (editingPackageId) {
        try {
          const pkg = await request(`/provider/packages/${editingPackageId}`);
          setPackageName(pkg.name || '');
          setLocation(pkg.destination || '');
          setPrice(pkg.price ? String(pkg.price) : '');
          setQuotaMax(pkg.quotaMax ? String(pkg.quotaMax) : '');
          setSchedule(pkg.schedule || '');
          setDescription(pkg.description || '');
        } catch (err) {
          console.error('Failed to load package details:', err);
        }
      }
    }
    loadPackage();
  }, [editingPackageId]);

  // Itinerary helper actions
  const handleAddActivity = (day: number) => {
    if (!newActivityTime || !newActivityTitle) return;
    setItineraries(prev => {
      const existingDay = prev.find(it => it.day === day);
      if (existingDay) {
        return prev.map(it => it.day === day 
          ? { ...it, activities: [...it.activities, { time: newActivityTime, title: newActivityTitle }] }
          : it
        );
      } else {
        return [...prev, { day, activities: [{ time: newActivityTime, title: newActivityTitle }] }];
      }
    });
    setNewActivityTime('');
    setNewActivityTitle('');
  };

  const handleDeleteActivity = (day: number, idx: number) => {
    setItineraries(prev => prev.map(it => it.day === day 
      ? { ...it, activities: it.activities.filter((_, i) => i !== idx) }
      : it
    ));
  };

  // Facilities helper actions
  const addFacility = (type: 'included' | 'excluded') => {
    if (type === 'included') {
      if (!newIncludedFacility) return;
      setIncludedFacilities(prev => [...prev, newIncludedFacility]);
      setNewIncludedFacility('');
    } else {
      if (!newExcludedFacility) return;
      setExcludedFacilities(prev => [...prev, newExcludedFacility]);
      setNewExcludedFacility('');
    }
  };

  const removeFacility = (type: 'included' | 'excluded', idx: number) => {
    if (type === 'included') {
      setIncludedFacilities(prev => prev.filter((_, i) => i !== idx));
    } else {
      setExcludedFacilities(prev => prev.filter((_, i) => i !== idx));
    }
  };

  // Photos helper actions
  const triggerPhotoUpload = () => {
    document.getElementById('photo-file-input')?.click();
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingPhoto(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        const res = await request('/provider/upload', {
          method: 'POST',
          body: formData,
        });
        if (res && res.documentPath) {
          setPackagePhotos(prev => [...prev, `http://localhost:8080${res.documentPath}`]);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Gagal mengunggah foto');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = (idx: number) => {
    setPackagePhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (status: 'draft' | 'publish') => {
    if (status === 'publish') {
      if (!packageName.trim()) {
        alert('Nama paket harus diisi');
        return;
      }
      if (!location.trim()) {
        alert('Lokasi destinasi harus diisi');
        return;
      }
      if (!price || parseInt(price, 10) <= 0) {
        alert('Harga harus berupa angka lebih dari 0');
        return;
      }
      if (!quotaMax || parseInt(quotaMax, 10) <= 0) {
        alert('Kuota maksimal harus berupa angka lebih dari 0');
        return;
      }
      if (!schedule.trim()) {
        alert('Jadwal keberangkatan harus diisi');
        return;
      }
    } else {
      if (!packageName.trim()) {
        alert('Nama paket harus diisi untuk menyimpan draf');
        return;
      }
    }

    try {
      const dbStatus = status === 'draft' ? 'Draft' : 'Aktif';
      const payload = {
        name: packageName,
        destination: location,
        price: parseInt(price, 10) || 0,
        quotaMax: parseInt(quotaMax, 10) || 0,
        schedule: schedule,
        status: dbStatus,
      };

      if (editingPackageId) {
        await request(`/provider/packages/${editingPackageId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        alert(status === 'draft' ? `Draf paket "${packageName}" berhasil diperbarui.` : `Paket "${packageName}" berhasil dipublikasikan.`);
      } else {
        await request('/provider/packages', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        alert(status === 'draft' ? `Draf paket "${packageName}" berhasil dibuat.` : `Paket "${packageName}" berhasil dipublikasikan.`);
      }
      navigateTo('kelola-paket');
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan paket wisata');
    }
  };

  return (
    <div className="dashboard-layout animate-fade-in">
      <Sidebar />

      <main className="dashboard-main">
        {/* Header toolbar */}
        <header className="dashboard-header">
          <div className="header-left-back">
            <button className="back-arrow-btn" onClick={() => navigateTo('kelola-paket')}>
              <ArrowLeft size={18} />
            </button>
            <div className="header-welcome">
              <h1>Tambah Paket Wisata</h1>
              <p>Lengkapi semua informasi paket dengan detail</p>
            </div>
          </div>
          <div className="header-actions-row">
            <button className="action-outline-btn" onClick={() => setShowPreviewModal(true)}>
              <Eye size={14} /> Preview
            </button>
            <button className="action-outline-btn" onClick={() => handleSubmit('draft')}>
              <Save size={14} /> Simpan Draft
            </button>
            <button className="action-solid-btn" onClick={() => handleSubmit('publish')}>
              <Send size={14} /> Publikasikan
            </button>
          </div>
        </header>

        {/* Wizard Form Layout Split */}
        <div className="add-pkg-split">
          
          {/* Stepper Checklist Card */}
          <div className="stepper-checklist-card">
            <div className="stepper-menu">
              {steps.map((s) => (
                <button 
                  key={s.id}
                  className={`stepper-btn ${activeStep === s.id ? 'active' : ''}`}
                  onClick={() => setActiveStep(s.id)}
                >
                  <span className="step-bullet"></span>
                  {s.label}
                </button>
              ))}
            </div>

            <div className="popularity-tips-box">
              <Sparkles size={18} className="tips-icon" />
              <div>
                <strong>Tips Paket Populer</strong>
                <p>Tambahkan minimal 5 foto berkualitas tinggi untuk meningkatkan booking hingga 3x lipat.</p>
              </div>
            </div>
          </div>

          {/* Form Content Card */}
          <div className="form-content-card">
            {activeStep === 'info' && (
              <div className="form-section-body">
                <h3>Informasi Dasar</h3>
                
                <div className="input-group">
                  <label>Nama Paket *</label>
                  <input 
                    type="text" 
                    value={packageName}
                    onChange={(e) => setPackageName(e.target.value)}
                    placeholder="Contoh: Raja Ampat Diving Adventure 5D4N"
                  />
                </div>

                <div className="input-row-2">
                  <div className="input-group">
                    <label>Kategori *</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)}>
                      <option value="diving">Diving & Snorkeling</option>
                      <option value="hiking">Hiking & Trekking</option>
                      <option value="culture">Wisata Budaya & Sejarah</option>
                      <option value="relax">Keluarga & Santai</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Durasi *</label>
                    <div className="input-suffix-wrapper">
                      <input 
                        type="number" 
                        value={duration} 
                        onChange={(e) => setDuration(e.target.value)} 
                        placeholder="5"
                      />
                      <span className="input-suffix">Hari</span>
                    </div>
                  </div>
                </div>

                <div className="input-group">
                  <label>Lokasi Destinasi *</label>
                  <div className="input-with-icon">
                    <MapPin size={16} className="field-icon" />
                    <input 
                      type="text" 
                      value={location} 
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Contoh: Raja Ampat, Papua Barat"
                      className="input-indent"
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label>Titik Kumpul *</label>
                  <input 
                    type="text" 
                    value={meetPoint} 
                    onChange={(e) => setMeetPoint(e.target.value)}
                    placeholder="Contoh: Bandara Marinda, Raja Ampat"
                  />
                </div>

                <div className="input-group">
                  <label>Deskripsi Paket *</label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={6}
                    placeholder="Tuliskan deskripsi paket wisata secara detail..."
                  />
                </div>
              </div>
            )}

            {activeStep === 'itinerary' && (
              <div className="form-section-body animate-fade-in">
                <h3>Itinerary Perjalanan</h3>
                <p className="section-subtitle">Buat rencana perjalanan detail hari demi hari sesuai durasi paket ({duration} Hari)</p>
                
                <div className="itinerary-tab-layout">
                  <div className="itinerary-days-nav">
                    {Array.from({ length: parseInt(duration, 10) || 1 }).map((_, i) => {
                      const dayNum = i + 1;
                      return (
                        <button 
                          type="button"
                          key={dayNum} 
                          className={`day-nav-btn ${selectedItineraryDay === dayNum ? 'active' : ''}`}
                          onClick={() => setSelectedItineraryDay(dayNum)}
                        >
                          Hari {dayNum}
                        </button>
                      );
                    })}
                  </div>

                  <div className="day-activities-panel">
                    <h4>Rencana Kegiatan Hari {selectedItineraryDay}</h4>
                    
                    <div className="activities-timeline">
                      {(() => {
                        const dayData = itineraries.find(it => it.day === selectedItineraryDay);
                        const acts = dayData ? dayData.activities : [];
                        if (acts.length === 0) {
                          return <p className="empty-activities-text">Belum ada aktivitas yang ditambahkan untuk hari ini.</p>;
                        }
                        return acts.map((act, idx) => (
                          <div key={idx} className="timeline-activity-item">
                            <span className="activity-time-badge"><Clock size={10} /> {act.time}</span>
                            <div className="activity-details">
                              <p>{act.title}</p>
                              <button 
                                type="button"
                                className="delete-activity-btn" 
                                onClick={() => handleDeleteActivity(selectedItineraryDay, idx)}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>

                    <div className="add-activity-form">
                      <h5>+ Tambah Aktivitas Hari {selectedItineraryDay}</h5>
                      <div className="add-activity-inputs">
                        <input 
                          type="text" 
                          placeholder="Waktu (contoh: 08:00 - 10:00)" 
                          value={newActivityTime}
                          onChange={(e) => setNewActivityTime(e.target.value)}
                        />
                        <input 
                          type="text" 
                          placeholder="Deskripsi aktivitas atau destinasi" 
                          value={newActivityTitle}
                          onChange={(e) => setNewActivityTitle(e.target.value)}
                        />
                        <button 
                          type="button" 
                          className="add-act-submit-btn"
                          onClick={() => handleAddActivity(selectedItineraryDay)}
                        >
                          Tambah
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeStep === 'facilities' && (
              <div className="form-section-body animate-fade-in">
                <h3>Fasilitas Wisata</h3>
                <p className="section-subtitle">Tentukan apa saja fasilitas yang didapatkan peserta (Included & Excluded)</p>
                
                <div className="facilities-columns-layout">
                  <div className="facility-col">
                    <h4 className="fac-header included"><CheckCircle size={14} /> Termasuk (Included)</h4>
                    <div className="facility-items-list">
                      {includedFacilities.map((fac, idx) => (
                        <div key={idx} className="facility-pill-item">
                          <span>{fac}</span>
                          <button type="button" className="remove-fac-btn" onClick={() => removeFacility('included', idx)}>×</button>
                        </div>
                      ))}
                    </div>
                    <div className="add-facility-input-row">
                      <input 
                        type="text" 
                        placeholder="Tambah fasilitas termasuk..." 
                        value={newIncludedFacility}
                        onChange={(e) => setNewIncludedFacility(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFacility('included'))}
                      />
                      <button type="button" className="add-fac-btn" onClick={() => addFacility('included')}><Plus size={14} /></button>
                    </div>
                  </div>

                  <div className="facility-col">
                    <h4 className="fac-header excluded"><XCircle size={14} /> Tidak Termasuk (Excluded)</h4>
                    <div className="facility-items-list">
                      {excludedFacilities.map((fac, idx) => (
                        <div key={idx} className="facility-pill-item error-pill">
                          <span>{fac}</span>
                          <button type="button" className="remove-fac-btn" onClick={() => removeFacility('excluded', idx)}>×</button>
                        </div>
                      ))}
                    </div>
                    <div className="add-facility-input-row">
                      <input 
                        type="text" 
                        placeholder="Tambah fasilitas tidak termasuk..." 
                        value={newExcludedFacility}
                        onChange={(e) => setNewExcludedFacility(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFacility('excluded'))}
                      />
                      <button type="button" className="add-fac-btn" onClick={() => addFacility('excluded')}><Plus size={14} /></button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeStep === 'pricing' && (
              <div className="form-section-body animate-fade-in">
                <h3>Jadwal & Harga</h3>
                <p className="section-subtitle">Lengkapi detail harga, kuota, jadwal keberangkatan, dan batas peserta</p>
                
                <div className="input-row-2">
                  <div className="input-group">
                    <label>Harga per Orang *</label>
                    <input 
                      type="number" 
                      value={price} 
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="Contoh: 1200000"
                    />
                  </div>
                  <div className="input-group">
                    <label>Kuota Maksimal *</label>
                    <input 
                      type="number" 
                      value={quotaMax} 
                      onChange={(e) => setQuotaMax(e.target.value)}
                      placeholder="Contoh: 15"
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label>Jadwal Keberangkatan *</label>
                  <input 
                    type="text" 
                    value={schedule} 
                    onChange={(e) => setSchedule(e.target.value)}
                    placeholder="Contoh: Setiap Jumat atau Setiap Hari"
                  />
                </div>

                <div className="input-row-2">
                  <div className="input-group">
                    <label>Minimum Peserta</label>
                    <input 
                      type="number" 
                      value={minGuests} 
                      onChange={(e) => setMinGuests(e.target.value)}
                      placeholder="2"
                    />
                  </div>
                  <div className="input-group">
                    <label>Maksimum Peserta</label>
                    <input 
                      type="number" 
                      value={maxGuests} 
                      onChange={(e) => setMaxGuests(e.target.value)}
                      placeholder="12"
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label>Batas Usia</label>
                  <div className="input-range-row">
                    <input 
                      type="number" 
                      value={minAge} 
                      onChange={(e) => setMinAge(e.target.value)} 
                      placeholder="10"
                    />
                    <span>s/d</span>
                    <input 
                      type="number" 
                      value={maxAge} 
                      onChange={(e) => setMaxAge(e.target.value)} 
                      placeholder="65"
                    />
                    <span className="range-suffix">tahun</span>
                  </div>
                </div>
              </div>
            )}

            {activeStep === 'photos' && (
              <div className="form-section-body animate-fade-in">
                <h3>Galeri Foto Paket</h3>
                <p className="section-subtitle">Unggah foto-foto terbaik destinasi untuk menarik minat pelanggan</p>
                
                <div className="photos-tab-layout">
                  <div 
                    className="photos-upload-dropzone"
                    onClick={triggerPhotoUpload}
                  >
                    <UploadCloud size={32} color="var(--color-accent)" />
                    <div>
                      <strong>{isUploadingPhoto ? 'Mengunggah...' : 'Klik untuk Unggah Foto'}</strong>
                      <p>Format JPG, PNG. Maksimal 5MB.</p>
                    </div>
                    <input 
                      type="file" 
                      id="photo-file-input" 
                      style={{ display: 'none' }}
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                    />
                  </div>

                  <div className="photos-gallery-grid">
                    {packagePhotos.map((url, idx) => (
                      <div key={idx} className="gallery-photo-card">
                        <img src={url} alt={`Gallery ${idx + 1}`} />
                        <button 
                          type="button"
                          className="delete-photo-btn"
                          onClick={() => handleDeletePhoto(idx)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </main>

      {showPreviewModal && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: '800px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: '28px' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-primary-dark)', margin: 0 }}>Pratinjau Paket Wisata</h2>
              <button style={{ background: 'transparent', border: 0, fontSize: '24px', cursor: 'pointer', color: 'var(--color-text-light)', padding: 0 }} onClick={() => setShowPreviewModal(false)}>×</button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Photo Banner */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                <div style={{ height: '300px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', backgroundColor: 'var(--color-bg-light)', position: 'relative' }}>
                  {packagePhotos.length > 0 ? (
                    <img src={packagePhotos[0]} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-light)' }}>Belum ada foto yang diunggah</div>
                  )}
                  <span style={{ position: 'absolute', top: '16px', right: '16px', backgroundColor: 'var(--color-accent)', color: '#ffffff', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, textTransform: 'capitalize' }}>
                    {category}
                  </span>
                </div>
                {packagePhotos.length > 1 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px' }}>
                    {packagePhotos.slice(1).map((photo, i) => (
                      <div key={i} style={{ height: '70px', borderRadius: 'var(--radius-md)', overflow: 'hidden', backgroundColor: 'var(--color-bg-light)' }}>
                        <img src={photo} alt={`Thumb ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Title & Info */}
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-primary-dark)', marginBottom: '8px', lineHeight: 1.3, margin: 0 }}>
                  {packageName || 'Nama Paket Wisata'}
                </h1>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', color: 'var(--color-text-medium)', fontSize: '13px', marginBottom: '16px', marginTop: '8px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>📍 {location || 'Destinasi Belum Diatur'}</span>
                  <span>⏱️ {duration} Hari</span>
                  <span>📅 {schedule || 'Jadwal Belum Diatur'}</span>
                  <span>👥 Kuota: {quotaMax || '0'} orang (Min: {minGuests} s/d Max: {maxGuests})</span>
                  <span>🔞 Batas Usia: {minAge} s/d {maxAge} tahun</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--color-bg-light)', padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-light)', display: 'block', fontWeight: 600 }}>HARGA MULAI DARI</span>
                    <strong style={{ fontSize: '20px', color: 'var(--color-accent)', fontWeight: 800 }}>
                      {price ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(parseInt(price, 10)) : 'Rp 0'}
                    </strong>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-light)' }}> / orang</span>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-primary-medium)' }}>
                    📍 MP: {meetPoint || 'Belum Diatur'}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '8px', borderLeft: '3px solid var(--color-accent)', paddingLeft: '10px', marginTop: 0 }}>Deskripsi Paket</h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-medium)', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>
                  {description || 'Belum ada deskripsi.'}
                </p>
              </div>

              {/* Itinerary */}
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '12px', borderLeft: '3px solid var(--color-accent)', paddingLeft: '10px', marginTop: 0 }}>Itinerary Rencana Perjalanan</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {itineraries.map((it, i) => (
                    <div key={i} style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '14px' }}>
                      <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary-medium)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                        <span style={{ backgroundColor: 'var(--color-accent-light)', color: 'var(--color-accent)', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>{it.day}</span>
                        Hari {it.day}
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '28px', marginTop: '8px' }}>
                        {it.activities.map((act, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '12px', fontSize: '12px', lineHeight: 1.5 }}>
                            <span style={{ fontWeight: 600, color: 'var(--color-accent)', flexShrink: 0, minWidth: '85px' }}>{act.time}</span>
                            <span style={{ color: 'var(--color-text-medium)' }}>{act.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Facilities */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-success)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                    ✓ Termasuk (Included)
                  </h4>
                  <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: 'var(--color-text-medium)', marginTop: '8px' }}>
                    {includedFacilities.map((fac, idx) => (
                      <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                        <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>•</span> {fac}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#ef4444', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                    ✗ Tidak Termasuk (Excluded)
                  </h4>
                  <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: 'var(--color-text-medium)', marginTop: '8px' }}>
                    {excludedFacilities.map((fac, idx) => (
                      <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                        <span style={{ color: '#ef4444', fontWeight: 'bold' }}>•</span> {fac}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
              <button className="action-solid-btn" style={{ padding: '10px 24px' }} onClick={() => setShowPreviewModal(false)}>Tutup Pratinjau</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .header-left-back {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .back-arrow-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 1px solid var(--color-border);
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: var(--transition-fast);
        }

        .back-arrow-btn:hover {
          background-color: var(--color-bg-light);
          color: var(--color-accent);
          border-color: var(--color-accent);
        }

        .header-actions-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .action-outline-btn {
          border: 1px solid var(--color-border);
          background: #ffffff;
          padding: 10px 18px;
          border-radius: var(--radius-md);
          font-size: 13px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .action-outline-btn:hover {
          background-color: var(--color-bg-light);
        }

        .action-solid-btn {
          background: var(--color-accent);
          color: #ffffff;
          padding: 10px 20px;
          border-radius: var(--radius-md);
          font-size: 13px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .action-solid-btn:hover {
          background: var(--color-accent-hover);
        }

        /* Layout forms splits */
        .add-pkg-split {
          display: grid;
          grid-template-columns: 240px 1fr;
          gap: 24px;
        }

        .stepper-checklist-card {
          background: #ffffff;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 20px;
          height: fit-content;
        }

        .stepper-menu {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 24px;
        }

        .stepper-btn {
          width: 100%;
          text-align: left;
          padding: 12px 16px;
          border-radius: var(--radius-md);
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text-medium);
          display: flex;
          align-items: center;
          gap: 10px;
          transition: var(--transition-fast);
          background: transparent;
          border: none;
          cursor: pointer;
        }

        .stepper-btn .step-bullet {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--color-border);
          display: inline-block;
        }

        .stepper-btn.active, .stepper-btn:hover {
          background-color: var(--color-bg-light);
          color: var(--color-accent);
        }

        .stepper-btn.active .step-bullet {
          background: var(--color-accent);
          box-shadow: 0 0 0 3px rgba(0, 168, 150, 0.2);
        }

        .popularity-tips-box {
          background-color: #e6f7f5;
          border: 1px solid rgba(0, 168, 150, 0.2);
          border-radius: var(--radius-md);
          padding: 14px;
          display: flex;
          gap: 12px;
          font-size: 11px;
          color: var(--color-primary-medium);
          line-height: 1.5;
        }

        .tips-icon {
          flex-shrink: 0;
          color: var(--color-accent);
        }

        /* Form card body */
        .form-content-card {
          background: #ffffff;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 32px;
        }

        .form-section-body h3 {
          font-size: 16px;
          margin-bottom: 24px;
          border-left: 3px solid var(--color-accent);
          padding-left: 10px;
        }

        .section-subtitle {
          font-size: 12px;
          color: var(--color-text-medium);
          margin-top: -18px;
          margin-bottom: 24px;
        }

        .input-row-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .input-suffix-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-suffix-wrapper input {
          width: 100%;
          padding-right: 60px !important;
        }

        .input-suffix {
          position: absolute;
          right: 16px;
          font-size: 12px;
          color: var(--color-text-medium);
          font-weight: 500;
        }

        .input-indent {
          padding-left: 42px !important;
        }

        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-with-icon .field-icon {
          position: absolute;
          left: 14px;
          color: var(--color-text-light);
        }

        .input-range-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .input-range-row input {
          width: 80px;
          text-align: center;
        }

        .range-suffix {
          font-size: 12px;
          color: var(--color-text-medium);
          font-weight: 500;
        }

        /* Itinerary style */
        .itinerary-tab-layout {
          display: grid;
          grid-template-columns: 100px 1fr;
          gap: 24px;
          border-top: 1px solid var(--color-border);
          padding-top: 20px;
        }

        .itinerary-days-nav {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .day-nav-btn {
          width: 100%;
          text-align: left;
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text-medium);
          background: transparent;
          border: 1px solid transparent;
          cursor: pointer;
          transition: var(--transition-fast);
        }

        .day-nav-btn.active, .day-nav-btn:hover {
          background-color: var(--color-accent-light);
          color: var(--color-accent);
          border-color: var(--color-accent-light);
        }

        .day-activities-panel {
          background: var(--color-bg-light);
          border-radius: var(--radius-md);
          padding: 20px;
          border: 1px solid var(--color-border);
        }

        .day-activities-panel h4 {
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 16px;
          color: var(--color-primary-dark);
        }

        .activities-timeline {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 20px;
          position: relative;
          padding-left: 14px;
        }

        .activities-timeline::before {
          content: '';
          position: absolute;
          left: 4px;
          top: 6px;
          bottom: 6px;
          width: 1px;
          background-color: var(--color-border);
        }

        .timeline-activity-item {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .timeline-activity-item::before {
          content: '';
          position: absolute;
          left: -14px;
          top: 4px;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background-color: var(--color-accent);
          border: 2px solid #ffffff;
        }

        .activity-time-badge {
          font-size: 9px;
          font-weight: 700;
          color: var(--color-accent);
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .activity-details {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #ffffff;
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--color-border);
        }

        .activity-details p {
          font-size: 12px;
          font-weight: 500;
          color: var(--color-text-dark);
          margin: 0;
          flex: 1;
        }

        .delete-activity-btn {
          color: var(--color-text-light);
          cursor: pointer;
          transition: var(--transition-fast);
          padding: 4px;
        }

        .delete-activity-btn:hover {
          color: #ef4444;
        }

        .empty-activities-text {
          font-size: 11px;
          color: var(--color-text-light);
          font-style: italic;
        }

        .add-activity-form {
          border-top: 1px dashed var(--color-border);
          padding-top: 16px;
          margin-top: 16px;
        }

        .add-activity-form h5 {
          font-size: 11px;
          font-weight: 700;
          color: var(--color-text-medium);
          margin-bottom: 10px;
        }

        .add-activity-inputs {
          display: grid;
          grid-template-columns: 140px 1fr 80px;
          gap: 10px;
        }

        .add-activity-inputs input {
          font-size: 12px;
          padding: 8px 10px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          outline: none;
          background: #ffffff;
        }

        .add-activity-inputs input:focus {
          border-color: var(--color-accent);
        }

        .add-act-submit-btn {
          background-color: var(--color-accent);
          color: #ffffff;
          font-size: 11px;
          font-weight: 600;
          border-radius: var(--radius-sm);
          border: none;
          cursor: pointer;
          transition: var(--transition-fast);
        }

        .add-act-submit-btn:hover {
          background-color: var(--color-accent-hover);
        }

        /* Facilities style */
        .facilities-columns-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          border-top: 1px solid var(--color-border);
          padding-top: 20px;
        }

        .facility-col {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .fac-header {
          font-size: 13px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .fac-header.included { color: var(--color-success); }
        .fac-header.excluded { color: #ef4444; }

        .facility-items-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-height: 100px;
          background: var(--color-bg-light);
          padding: 12px;
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border);
        }

        .facility-pill-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #ffffff;
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--color-border);
          font-size: 12px;
          font-weight: 500;
          color: var(--color-text-dark);
        }

        .facility-pill-item.error-pill {
          border-color: #fecaca;
        }

        .remove-fac-btn {
          color: var(--color-text-light);
          cursor: pointer;
          font-weight: 700;
          font-size: 14px;
          background: none;
          border: none;
          padding: 0 4px;
        }

        .remove-fac-btn:hover {
          color: #ef4444;
        }

        .add-facility-input-row {
          display: flex;
          gap: 8px;
        }

        .add-facility-input-row input {
          flex: 1;
          font-size: 12px;
          padding: 8px 12px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          outline: none;
        }

        .add-facility-input-row input:focus {
          border-color: var(--color-accent);
        }

        .add-fac-btn {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-sm);
          background-color: var(--color-accent);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          cursor: pointer;
          transition: var(--transition-fast);
        }

        .add-fac-btn:hover {
          background-color: var(--color-accent-hover);
        }

        /* Photos style */
        .photos-tab-layout {
          display: flex;
          flex-direction: column;
          gap: 24px;
          border-top: 1px solid var(--color-border);
          padding-top: 20px;
        }

        .photos-upload-dropzone {
          border: 2px dashed var(--color-border);
          border-radius: var(--radius-lg);
          padding: 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          cursor: pointer;
          transition: var(--transition-fast);
          gap: 12px;
          background: var(--color-bg-light);
        }

        .photos-upload-dropzone:hover {
          border-color: var(--color-accent);
          background: var(--color-accent-light);
        }

        .photos-upload-dropzone strong {
          font-size: 13px;
          color: var(--color-text-dark);
          display: block;
        }

        .photos-upload-dropzone p {
          font-size: 11px;
          color: var(--color-text-light);
          margin-top: 4px;
        }

        .photos-gallery-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }

        .gallery-photo-card {
          position: relative;
          aspect-ratio: 4/3;
          border-radius: var(--radius-md);
          overflow: hidden;
          border: 1px solid var(--color-border);
          box-shadow: var(--shadow-sm);
        }

        .gallery-photo-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .delete-photo-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid var(--color-border);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ef4444;
          cursor: pointer;
          transition: var(--transition-fast);
          box-shadow: var(--shadow-sm);
        }

        .delete-photo-btn:hover {
          background: #ef4444;
          color: #ffffff;
          border-color: #ef4444;
        }

        @media (max-width: 992px) {
          .add-pkg-split {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};
