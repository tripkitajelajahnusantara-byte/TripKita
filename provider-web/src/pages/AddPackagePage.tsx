import React, { useState } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { Sidebar } from '../components/Sidebar';
import { 
  ArrowLeft, 
  ArrowUp,
  ArrowDown,
  Save, 
  Send, 
  Sparkles,
  MapPin,
  Trash2,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  UploadCloud,
  LoaderCircle
} from 'lucide-react';

import { request } from '../utils/api';
import { AvailabilityCalendar } from '../components/AvailabilityCalendar';
import { addDays, jakartaToday, threeMonthLimit, tripEndDate, rangeAvailable } from '../utils/tripDates';
import { PROVINCES } from '../utils/locationData';
import { OFFICIAL_CATEGORIES, OFFICIAL_TRIP_TYPES, resolveMediaUrl } from '../utils/tripImages';
import { TripImage } from '../components/TripImage';
import { useActionLock } from '../utils/useActionLock';
import { useCustomAlert } from '../components/CustomAlertModal';
import { getMeetingPointCoordinates, type MeetingPointCoordinates } from '../components/MeetingPointMap';
import { MeetingPointPicker } from '../components/MeetingPointPicker';

/** Open Trip berangkat bersama pada jadwal tetap; tipe lain eksklusif per tanggal. */
function isOpenTripType(tripType: string): boolean {
  return tripType.toLowerCase().replace(/\s+/g, '') === 'opentrip';
}

function suggestedMinimumGuests(tripType: string): string {
  if (tripType === 'Honeymoon' || tripType === 'Private Trip') return '2';
  if (tripType === 'Family') return '3';
  if (tripType === 'Corporate') return '10';
  return '1';
}
export const CATEGORIES = OFFICIAL_CATEGORIES;
export const TRIP_TYPES = OFFICIAL_TRIP_TYPES;

// Foto lama bisa tersimpan sebagai URL absolut ber-host lokal (mis. saat
// development). Ubah menjadi path "/uploads/..." agar tidak ikut tersimpan ulang.
function toStoredPhotoPath(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    // Foto paket publik disimpan relatif, apa pun host yang dulu tercatat.
    if (/^\/uploads\/pkg_[0-9a-f]{32}\.(jpg|png)$/.test(parsed.pathname)) {
      return parsed.pathname;
    }
    if (['localhost', '127.0.0.1', '0.0.0.0', '10.0.2.2'].includes(parsed.hostname) && parsed.pathname.startsWith('/uploads/')) {
      return parsed.pathname;
    }
  } catch {
    // Bukan URL absolut: sudah berupa path.
  }
  return trimmed;
}

// Hanya referensi yang diterima backend saat simpan: foto paket publik
// ("/uploads/pkg_...") atau URL HTTPS eksternal. Sisa data lama (teks bukan
// URL, http://, dokumen "doc_") dibuang agar paket tetap dapat disimpan.
function isSavablePhotoRef(ref: string): boolean {
  if (/^\/uploads\/pkg_[0-9a-f]{32}\.(jpg|png)$/.test(ref)) return true;
  return /^https:\/\//i.test(ref) && !ref.includes('/uploads/doc_');
}

export const AddPackagePage: React.FC = () => {
  const { navigateTo, editingPackageId } = useNavigation();
  const { showAlert } = useCustomAlert();
  const [activeStep, setActiveStep] = useState<'info' | 'itinerary' | 'facilities' | 'pricing' | 'photos'>('info');

  // Form states
  const [packageName, setPackageName] = useState('');
  // Select menampilkan opsi pertama walau value React masih kosong. Beri nilai
  // awal nyata agar menyimpan tanpa menyentuh dropdown tidak mengirim string kosong.
  const [category, setCategory] = useState(CATEGORIES[0] || '');
  const [tripType, setTripType] = useState(TRIP_TYPES[0] || '');
  const [duration, setDuration] = useState('');
  const [location, setLocation] = useState('');
  const [meetPoint, setMeetPoint] = useState('');
  const [mapPosition, setMapPosition] = useState<MeetingPointCoordinates | null>(null);
  const [description, setDescription] = useState('');
  const [minGuests, setMinGuests] = useState('1');
  const [useMinimumBooking, setUseMinimumBooking] = useState(false);
  const [maxGuests, setMaxGuests] = useState('');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');

  // New fields mapping to backend
  const todayStr = isOpenTripType(tripType) ? new Date().toISOString().split('T')[0] : jakartaToday();
  const latestDate = threeMonthLimit(todayStr);
  const [price, setPrice] = useState('');
  const [quotaMin, setQuotaMin] = useState('');
  const [quotaMax, setQuotaMax] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [bookedPackageDates, setBookedPackageDates] = useState<string[]>([]);
  const [availabilityDates, setAvailabilityDates] = useState<string[]>([]);
  const [schedule, setSchedule] = useState('');
  const requiresMinimumQuota = isOpenTripType(tripType);
  // Unggah foto dan simpan paket berbagi satu kunci: paket tidak boleh disimpan
  // selagi foto masih diunggah (foto baru belum masuk payload), dan sebaliknya.
  const { pending, isBusy, run } = useActionLock();

  const showValidation = (message: string, step?: typeof activeStep) => {
    if (step) setActiveStep(step);
    showAlert({
      title: 'Periksa Data Paket',
      message,
      type: 'warning',
      confirmText: 'Perbaiki Data',
    });
  };

  const handleDigitsOnlyInput = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string>>,
    fieldLabel: string,
    step: typeof activeStep,
  ) => {
    if (/^\d*$/.test(value)) {
      setter(value);
      return;
    }
    showValidation(`${fieldLabel} hanya boleh diisi angka bulat tanpa huruf, tanda minus, atau desimal.`, step);
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (val && isOpenTripType(tripType)) {
      const durNum = parseInt(duration, 10) || 1;
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        d.setDate(d.getDate() + Math.max(0, durNum - 1));
        const calculatedEnd = d.toISOString().split('T')[0];
        setEndDate(calculatedEnd);
        setSchedule(`${val} s/d ${calculatedEnd} (${durNum} Hari)`);
      }
    }
  };

  React.useEffect(() => {
    if (startDate && isOpenTripType(tripType)) {
      const durNum = parseInt(duration, 10) || 1;
      const d = new Date(startDate);
      if (!isNaN(d.getTime())) {
        d.setDate(d.getDate() + Math.max(0, durNum - 1));
        const calculatedEnd = d.toISOString().split('T')[0];
        setEndDate(calculatedEnd);
        setSchedule(`${startDate} s/d ${calculatedEnd} (${durNum} Hari)`);
      }
    }
  }, [duration]);

  // Itinerary states
  // Paket baru dimulai kosong: contoh hanya muncul sebagai placeholder agar
  // tidak ikut terpublikasi sebagai janji yang tidak ditawarkan mitra.
  const [itineraries, setItineraries] = useState<{ day: number; activities: { time: string; title: string }[] }[]>([
    { day: 1, activities: [] }
  ]);
  const [newActivityTime, setNewActivityTime] = useState('');
  const [newActivityTitle, setNewActivityTitle] = useState('');
  const [selectedItineraryDay, setSelectedItineraryDay] = useState(1);

  // Facilities states
  const [includedFacilities, setIncludedFacilities] = useState<string[]>([]);
  const [excludedFacilities, setExcludedFacilities] = useState<string[]>([]);
  // Mode edit: bila data paket gagal dimuat, penyimpanan dikunci supaya form
  // kosong tidak menimpa paket asli.
  const [packageLoadError, setPackageLoadError] = useState('');
  const [packageLoadAttempt, setPackageLoadAttempt] = useState(0);
  const [newIncludedFacility, setNewIncludedFacility] = useState('');
  const [newExcludedFacility, setNewExcludedFacility] = useState('');

  // Photos states
  // Paket baru dimulai tanpa foto: mitra wajib mengunggah foto aslinya sendiri.
  const [packagePhotos, setPackagePhotos] = useState<string[]>([]);
  const isUploadingPhoto = pending === 'photos';

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
          setMeetPoint(pkg.meetingPoint || '');
          const savedCoordinates = getMeetingPointCoordinates(pkg);
          if (savedCoordinates) {
            setMapPosition(savedCoordinates);
          }
          setPrice(pkg.price ? String(pkg.price) : '');
          const loadedTripType = pkg.tripType || TRIP_TYPES[0] || '';
          setQuotaMin(isOpenTripType(loadedTripType) && pkg.quotaMin ? String(pkg.quotaMin) : '');
          setQuotaMax(pkg.quotaMax ? String(pkg.quotaMax) : '');
          if (pkg.category) setCategory(pkg.category);
          if (pkg.tripType) setTripType(pkg.tripType);
          if (pkg.startDate) setStartDate(pkg.startDate);
          if (pkg.endDate) setEndDate(pkg.endDate);
          setBookedPackageDates(Array.isArray(pkg.bookedDates) ? pkg.bookedDates : []);
          if (!isOpenTripType(loadedTripType)) {
            const configured: string[] = (pkg.configuredDates || pkg.availableDates || []).filter((day: string) => day >= jakartaToday());
            configured.sort();
            setAvailabilityDates(configured);
            setStartDate(configured[0] || '');
            setEndDate(configured[configured.length - 1] || '');
          }
          if (pkg.duration) setDuration(String(pkg.duration));
          const loadedMinGuests = Math.max(1, Number(pkg.minGuests) || 1);
          setMinGuests(String(loadedMinGuests));
          setUseMinimumBooking(loadedMinGuests > 1);
          if (pkg.maxGuests) setMaxGuests(String(pkg.maxGuests));
          if (pkg.minAge) setMinAge(String(pkg.minAge));
          if (pkg.maxAge) setMaxAge(String(pkg.maxAge));
          setSchedule(pkg.schedule || '');
          if (pkg.description) setDescription(pkg.description);
          if (pkg.includedFacilities) setIncludedFacilities(pkg.includedFacilities.split('\n').filter(Boolean));
          if (pkg.excludedFacilities) setExcludedFacilities(pkg.excludedFacilities.split('\n').filter(Boolean));
          if (pkg.itinerary) {
            try {
              const parsed = JSON.parse(pkg.itinerary);
              if (Array.isArray(parsed) && parsed.length > 0) setItineraries(parsed);
            } catch {
              // ignore
            }
          }
          const rawPhotos: string[] = (pkg.images ? pkg.images.split(',') : [pkg.image || ''])
            .map(toStoredPhotoPath)
            .filter(Boolean);
          const savablePhotos = rawPhotos.filter(isSavablePhotoRef);
          if (savablePhotos.length > 0) setPackagePhotos(savablePhotos);
          const droppedPhotos = rawPhotos.length - savablePhotos.length;
          if (droppedPhotos > 0) {
            showAlert({
              title: 'Sebagian Foto Perlu Diunggah Ulang',
              message: `${droppedPhotos} foto lama pada paket ini tidak lagi valid dan tidak ditampilkan. Unggah ulang foto tersebut di langkah Foto sebelum menyimpan.`,
              type: 'warning',
            });
          }
          setPackageLoadError('');
        } catch (err: any) {
          console.error('Failed to load package details:', err);
          setPackageLoadError(err?.message || 'Data paket gagal dimuat.');
        }
      }
    }
    loadPackage();
  }, [editingPackageId, packageLoadAttempt]);

  React.useEffect(() => {
    if (editingPackageId || requiresMinimumQuota) return;
    let cancelled = false;
    request('/provider/packages').then((packages) => {
      if (!cancelled && Array.isArray(packages)) {
        const busy: string[] = packages.filter(pkg => !isOpenTripType(pkg.tripType || '')).flatMap(pkg => pkg.bookedDates || []);
        setBookedPackageDates([...new Set(busy)].sort());
      }
    }).catch(error => console.error('Gagal memuat availability provider:', error));
    return () => { cancelled = true; };
  }, [editingPackageId, requiresMinimumQuota]);

  // Itinerary helper actions
  const handleAddActivity = (day: number) => {
    if (!newActivityTime.trim() || !newActivityTitle.trim()) return;
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

  const handleEditActivity = (day: number, idx: number, field: 'time' | 'title', value: string) => {
    setItineraries(prev => prev.map(it => it.day === day
      ? { ...it, activities: it.activities.map((activity, i) => i === idx ? { ...activity, [field]: value } : activity) }
      : it));
  };

  const handleMoveActivity = (day: number, idx: number, direction: -1 | 1) => {
    setItineraries(prev => prev.map(it => {
      if (it.day !== day || idx + direction < 0 || idx + direction >= it.activities.length) return it;
      const activities = [...it.activities];
      [activities[idx], activities[idx + direction]] = [activities[idx + direction], activities[idx]];
      return { ...it, activities };
    }));
  };

  const handleInsertActivity = (day: number, idx: number) => {
    setItineraries(prev => prev.map(it => it.day === day
      ? { ...it, activities: [...it.activities.slice(0, idx + 1), { time: '', title: '' }, ...it.activities.slice(idx + 1)] }
      : it));
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
    if (isBusy) return;
    if (packagePhotos.length >= 20) {
      showAlert({ title: 'Batas Foto Tercapai', message: 'Jumlah foto paket telah mencapai batas maksimal 20 foto.', type: 'warning' });
      return;
    }
    document.getElementById('photo-file-input')?.click();
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const maxFileSize = 2 * 1024 * 1024; // 2 MB
    const allowedExtensions = ['jpg', 'jpeg', 'png'];
    const newPhotos: string[] = [];
    const input = e.target;

    await run('photos', async () => {
      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];

          if (packagePhotos.length + newPhotos.length >= 20) {
            showAlert({ title: 'Batas Foto Tercapai', message: 'Jumlah foto paket telah mencapai batas maksimal 20 foto.', type: 'warning' });
            break;
          }

          const ext = file.name.split('.').pop()?.toLowerCase();
          if (!ext || !allowedExtensions.includes(ext)) {
            showAlert({ title: 'Format Foto Tidak Didukung', message: `File “${file.name}” harus menggunakan format JPG, JPEG, atau PNG.`, type: 'warning' });
            continue;
          }

          if (file.size > maxFileSize) {
            showAlert({ title: 'Ukuran Foto Terlalu Besar', message: `Ukuran “${file.name}” adalah ${(file.size / (1024 * 1024)).toFixed(2)} MB. Maksimal ukuran setiap foto adalah 2 MB.`, type: 'warning' });
            continue;
          }

          const formData = new FormData();
          formData.append('file', file);
          const res = await request('/provider/packages/photos', {
            method: 'POST',
            body: formData,
          });
          // Simpan path relatif dari server; origin backend ditambahkan saat
          // ditampilkan sehingga database tidak terikat host tertentu.
          if (res && res.photoPath) {
            newPhotos.push(res.photoPath);
          }
        }
      } catch (err: any) {
		showAlert({
		  title: 'Unggah Foto Belum Selesai',
		  message: newPhotos.length > 0
			? `${err.message || 'Gagal mengunggah foto'}. ${newPhotos.length} foto yang sudah terunggah tetap disimpan.`
			: (err.message || 'Gagal mengunggah foto'),
		  type: 'error',
		});
      } finally {
        // Foto yang sudah berhasil diunggah sebelum terjadi kegagalan tetap
        // ditambahkan, supaya provider tidak perlu mengunggah ulang semuanya.
        if (newPhotos.length > 0) {
          setPackagePhotos(prev => [...prev, ...newPhotos]);
        }
        input.value = '';
      }
    });
  };

  const handleDeletePhoto = (idx: number) => {
    setPackagePhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (status: 'draft' | 'publish') => {
    if (isBusy) return;

	const priceValue = price === '' ? Number.NaN : Number(price);
	const qMin = quotaMin === '' ? Number.NaN : Number(quotaMin);
	const qMax = quotaMax === '' ? Number.NaN : Number(quotaMax);
	const minG = useMinimumBooking ? (minGuests === '' ? Number.NaN : Number(minGuests)) : 1;
	const maxG = maxGuests === '' ? Number.NaN : Number(maxGuests);
	const durationValue = Number(duration);
	const minAgeValue = minAge === '' ? 0 : Number(minAge);
	const maxAgeValue = maxAge === '' ? 0 : Number(maxAge);

	// Validasi ini berlaku juga saat menyimpan draf: draf boleh belum lengkap,
	// tetapi nilai yang sudah diisi tidak boleh rusak atau negatif.
	if (duration !== '' && (!Number.isInteger(durationValue) || durationValue < 1)) {
	  showValidation('Durasi harus berupa bilangan bulat minimal 1 hari dan tidak boleh bernilai minus.', 'info');
	  return;
	}
	if ((minAge !== '' && (!Number.isInteger(minAgeValue) || minAgeValue < 0)) ||
	    (maxAge !== '' && (!Number.isInteger(maxAgeValue) || maxAgeValue < 0))) {
	  showValidation('Batas umur harus berupa bilangan bulat 0 atau lebih. Nilai umur tidak boleh minus.', 'pricing');
	  return;
	}
	if (maxAge !== '' && minAgeValue > maxAgeValue) {
	  showValidation(`Umur maksimal (${maxAgeValue}) tidak boleh lebih kecil dari umur minimal (${minAgeValue}).`, 'pricing');
	  return;
	}
	const enteredPricingValues = [
	  ['Harga', price, priceValue],
	  ['Kuota minimal', quotaMin, qMin],
	  ['Kuota maksimal', quotaMax, qMax],
	  ['Minimum peserta', useMinimumBooking ? minGuests : '1', minG],
	  ['Maksimum peserta', maxGuests, maxG],
	] as const;
	const invalidPricing = enteredPricingValues.find(([label, raw, value]) =>
	  (label !== 'Kuota minimal' || requiresMinimumQuota) &&
	  raw !== '' &&
	  (!Number.isFinite(value) || !Number.isInteger(value) || value < 0)
	);
	if (invalidPricing) {
	  showValidation(`${invalidPricing[0]} harus berupa bilangan bulat dan tidak boleh bernilai minus.`, 'pricing');
	  return;
	}
	if (priceValue > 1_000_000_000_000 || qMax > 10_000) {
	  showValidation('Harga atau kuota paket melebihi batas yang diizinkan.', 'pricing');
	  return;
	}
	if (startDate && endDate && endDate < startDate) {
	  showValidation('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.', 'pricing');
	  return;
	}

    if (editingPackageId && packageLoadError) {
      showAlert({ title: 'Data Paket Belum Termuat', message: 'Muat ulang data paket terlebih dahulu agar perubahan tidak menimpa paket dengan data kosong.', type: 'warning' });
      return;
    }

    const incompleteDay = itineraries.find(day => day.activities.some(activity => !activity.time.trim() || !activity.title.trim()));
    if (incompleteDay) {
      setSelectedItineraryDay(incompleteDay.day);
      showValidation(`Lengkapi waktu dan judul setiap kegiatan pada hari ${incompleteDay.day}, atau hapus kegiatan yang tidak diperlukan.`, 'itinerary');
      return;
    }

    if (status === 'publish') {
      if (!packageName.trim()) {
		showValidation('Nama paket wisata wajib diisi sebelum paket dipublikasikan.', 'info');
        return;
      }
	  if (!category || !tripType) {
		showValidation('Kategori dan tipe trip wajib dipilih sebelum paket dipublikasikan.', 'info');
		return;
	  }
      if (!location.trim()) {
		showValidation('Lokasi destinasi wajib dipilih sebelum paket dipublikasikan.', 'info');
        return;
      }
	  if (!meetPoint.trim()) {
		showValidation('Pin titik kumpul wajib dipilih pada peta.', 'info');
		return;
	  }
	  if (!mapPosition) {
		showValidation('Klik peta untuk menentukan koordinat latitude dan longitude titik kumpul.', 'info');
		return;
	  }
	  if (!description.trim()) {
		showValidation('Deskripsi paket wajib diisi sebelum paket dipublikasikan.', 'info');
		return;
	  }
      if (!price || priceValue <= 0) {
		showValidation('Harga per orang harus berupa angka lebih dari 0.', 'pricing');
        return;
      }
      if (!duration || durationValue < 1) {
		showValidation('Durasi paket wajib diisi dan minimal 1 hari.', 'info');
        return;
      }
      if (requiresMinimumQuota && (isNaN(qMin) || qMin < 1)) {
		showValidation('Kuota minimal wajib diisi dan minimal 1 peserta.', 'pricing');
        return;
      }
      if (isNaN(qMax) || qMax <= 0) {
		showValidation('Kuota maksimal harus lebih besar dari 0, misalnya 15.', 'pricing');
        return;
      }
      if (requiresMinimumQuota && qMax < qMin) {
		showValidation(`Kuota maksimal (${qMax}) tidak boleh lebih kecil dari kuota minimal (${qMin}).`, 'pricing');
        return;
      }
      if (useMinimumBooking && (isNaN(minG) || minG < 1)) {
		showValidation('Minimum peserta per pemesanan minimal 1 orang.', 'pricing');
        return;
      }
      if (isNaN(maxG) || maxG < minG) {
		showValidation(`Maksimum peserta per pemesanan (${maxG}) tidak boleh lebih kecil dari minimum peserta (${minG}).`, 'pricing');
        return;
      }
      if (maxG > qMax) {
		showValidation(`Maksimum peserta per pemesanan (${maxG}) tidak boleh melebihi kuota maksimal paket (${qMax}).`, 'pricing');
        return;
      }
      if (!startDate || !endDate) {
		showValidation('Tanggal mulai dan tanggal selesai keberangkatan wajib diisi.', 'pricing');
        return;
      }
      if (startDate < todayStr) {
		showValidation('Tanggal mulai keberangkatan tidak boleh menggunakan tanggal yang sudah lewat.', 'pricing');
        return;
      }
      if (!itineraries.some((day) => day.activities.length > 0)) {
		showValidation('Tambahkan minimal satu kegiatan pada itinerary sebelum paket dipublikasikan.', 'itinerary');
        return;
      }
      if (includedFacilities.length === 0) {
		showValidation('Tambahkan minimal satu fasilitas yang termasuk dalam paket.', 'facilities');
        return;
      }
      if (packagePhotos.length < 3) {
		showValidation(`Minimal 3 foto wajib diunggah. Saat ini baru ada ${packagePhotos.length} foto.`, 'photos');
        return;
      }
    } else {
      if (!packageName.trim()) {
		showValidation('Nama paket harus diisi untuk menyimpan draf.', 'info');
        return;
      }
    }

    if (!isOpenTripType(tripType) && (!availabilityDates.length || availabilityDates.some(day => day < todayStr || day > latestDate) ||
      !availabilityDates.some(day => rangeAvailable(day, tripEndDate(day, durationValue || 1), todayStr, latestDate, availabilityDates)))) {
      showValidation('Buka tanggal availability maksimal tiga bulan ke depan. Sediakan setidaknya satu periode yang cukup untuk durasi perjalanan.', 'pricing');
      return;
    }

    await run(status, async () => {
      try {
        const dbStatus = status === 'draft' ? 'Draft' : 'Aktif';
        const finalSchedule = isOpenTripType(tripType) ? (schedule.trim() || (startDate && endDate ? `${startDate} s/d ${endDate} (${duration} Hari)` : 'Jadwal Fleksibel')) : 'Sesuai kalender availability';

        const payload = {
          name: packageName,
          destination: location,
          meetingPoint: meetPoint,
          meetingPointLatitude: mapPosition?.lat ?? null,
          meetingPointLongitude: mapPosition?.lng ?? null,
          category: category,
          tripType: tripType,
		  price: Number.isFinite(priceValue) ? priceValue : 0,
          // Kuota minimum adalah ambang keberangkatan bersama dan hanya berlaku
          // untuk Open Trip. Tipe lain memakai minimum peserta per booking.
          quotaMin: requiresMinimumQuota && Number.isFinite(qMin) ? qMin : 0,
          quotaMax: Number.isFinite(qMax) ? qMax : 0,
          startDate: startDate,
          endDate: endDate,
          ...(!isOpenTripType(tripType) ? { availableDates: availabilityDates } : {}),
          schedule: finalSchedule,
		  duration: duration === '' ? 1 : durationValue,
          minGuests: Number.isFinite(minG) ? minG : 0,
          maxGuests: Number.isFinite(maxG) ? maxG : 0,
		  minAge: minAgeValue,
		  maxAge: maxAgeValue,
          status: dbStatus,
          description: description,
          includedFacilities: includedFacilities.join('\n'),
          excludedFacilities: excludedFacilities.join('\n'),
          itinerary: JSON.stringify(itineraries.map(day => ({ ...day, activities: day.activities.map(activity => ({ time: activity.time.trim(), title: activity.title.trim() })) }))),
          image: packagePhotos[0] || '',
          images: packagePhotos.join(','),
        };

		let savedPackage;
        if (editingPackageId) {
          savedPackage = await request(`/provider/packages/${editingPackageId}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          });
        } else {
		  savedPackage = await request('/provider/packages', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
        }

		// Jangan tampilkan sukses bila server mengabaikan nilai update. PKG-02
		// mengharuskan hasil tersimpan sama dengan payload yang dinyatakan sukses.
		if (!savedPackage?.id || savedPackage.status !== dbStatus || savedPackage.name !== payload.name ||
		    savedPackage.category !== payload.category || savedPackage.tripType !== payload.tripType ||
		    Number(savedPackage.quotaMin) !== payload.quotaMin ||
		    Number(savedPackage.duration) !== payload.duration ||
		    (mapPosition && (
		      !Number.isFinite(Number(savedPackage.meetingPointLatitude)) ||
		      !Number.isFinite(Number(savedPackage.meetingPointLongitude)) ||
		      Math.abs(Number(savedPackage.meetingPointLatitude) - mapPosition.lat) > 0.0000001 ||
		      Math.abs(Number(savedPackage.meetingPointLongitude) - mapPosition.lng) > 0.0000001
		    ))) {
		  throw new Error('Server belum menyimpan seluruh perubahan paket. Muat ulang data lalu coba kembali.');
		}

		showAlert({
		  title: status === 'draft' ? 'Draf Tersimpan' : 'Paket Berhasil Dipublikasikan',
		  message: status === 'draft'
		    ? `Draf paket “${packageName}” berhasil ${editingPackageId ? 'diperbarui' : 'dibuat'}.`
		    : `Paket “${packageName}” sudah aktif dan dapat dilihat pelanggan.`,
		  type: 'success',
		  confirmText: 'Lihat Daftar Paket',
		  onConfirm: () => navigateTo('kelola-paket'),
		});
      } catch (err: any) {
		showAlert({
		  title: 'Paket Belum Tersimpan',
		  message: err.message || 'Gagal menyimpan paket wisata. Periksa kembali data yang diisi.',
		  type: 'error',
		  confirmText: 'Periksa Kembali',
		});
      }
    });
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
              <h1>{editingPackageId ? 'Edit Paket Wisata' : 'Tambah Paket Wisata'}</h1>
              <p>{editingPackageId ? 'Perbarui informasi paket wisata Anda' : 'Lengkapi semua informasi paket dengan detail'}</p>
            </div>
          </div>
          <div className="header-actions-row">
            {/* Kedua tombol terkunci selama ada proses (simpan maupun unggah foto);
                indikator hanya tampil pada tombol yang diklik. */}
            <button
              className="action-outline-btn"
              onClick={() => handleSubmit('draft')}
              disabled={isBusy}
              aria-busy={pending === 'draft'}
              title={isUploadingPhoto ? 'Tunggu hingga unggah foto selesai' : undefined}
            >
              {pending === 'draft'
                ? <><LoaderCircle size={14} className="btn-spinner" aria-hidden="true" /> Menyimpan...</>
                : <><Save size={14} /> Simpan Draft</>}
            </button>
            <button
              className="action-solid-btn"
              onClick={() => handleSubmit('publish')}
              disabled={isBusy}
              aria-busy={pending === 'publish'}
              title={isUploadingPhoto ? 'Tunggu hingga unggah foto selesai' : undefined}
            >
              {pending === 'publish'
                ? <><LoaderCircle size={14} className="btn-spinner" aria-hidden="true" /> Memproses...</>
                : <><Send size={14} /> Publikasikan</>}
            </button>
          </div>
        </header>

        {editingPackageId && packageLoadError && (
          <div role="alert" style={{ margin: '0 0 16px', padding: '12px 16px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span><strong>Data paket gagal dimuat.</strong> {packageLoadError} Penyimpanan dikunci sampai data termuat.</span>
            <button type="button" className="action-outline-btn" onClick={() => setPackageLoadAttempt((n) => n + 1)}>Coba Lagi</button>
          </div>
        )}

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
                <p>Unggah minimal 3 foto asli yang terang dan jelas (disarankan 5 atau lebih). Foto pertama menjadi sampul paket.</p>
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

                <div className="input-row-3">
                  <div className="input-group">
                    <label>Kategori *</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)}>
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Tipe Trip *</label>
                    <select 
                      value={tripType} 
                      onChange={(e) => {
                        const val = e.target.value;
                        if (isOpenTripType(val) !== isOpenTripType(tripType)) {
                          setStartDate('');
                          setEndDate('');
                          setSchedule('');
                          setAvailabilityDates([]);
                        }
                        setTripType(val);
                        setQuotaMin(isOpenTripType(val) ? (quotaMin || '1') : '');
                        setMinGuests(useMinimumBooking ? suggestedMinimumGuests(val) : '1');
                      }}
                    >
                      {TRIP_TYPES.map(tt => (
                        <option key={tt} value={tt}>{tt === 'Family' || tt === 'Corporate' ? `${tt} Trip` : tt}</option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Durasi *</label>
                    <div className="input-suffix-wrapper">
                      <input 
						type="text"
						inputMode="numeric"
						pattern="[0-9]*"
                        value={duration} 
                        onChange={(e) => handleDigitsOnlyInput(e.target.value, setDuration, 'Durasi', 'info')}
                        placeholder="Contoh: 3"
                      />
                      <span className="input-suffix">Hari</span>
                    </div>
                  </div>
                </div>

                <div className="input-group">
                  <label>Lokasi Destinasi (Provinsi) *</label>
                  <div className="input-with-icon">
                    <MapPin size={16} className="field-icon" />
                    <select 
                      value={location} 
                      onChange={(e) => {
                        setLocation(e.target.value);
                        setMapPosition(null);
                      }}
                      className="input-indent"
                    >
                      <option value="" disabled>Pilih provinsi destinasi</option>
                      {PROVINCES.map(prov => (
                        <option key={prov} value={prov}>{prov}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="input-group">
                  <label>Alamat Titik Kumpul *</label>
                  <MeetingPointPicker address={meetPoint} position={mapPosition} onAddressChange={setMeetPoint} onSelect={setMapPosition} />
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
                <p className="section-subtitle">Waktu dan kegiatan bisa diedit langsung. Gunakan panah untuk mengubah urutan atau sisipkan kegiatan di tengah. Perubahan tersimpan saat paket disimpan.</p>
                
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
                            <label className="activity-time-badge"><Clock size={12} />
                              <input aria-label={`Waktu kegiatan ${idx + 1} hari ${selectedItineraryDay}`} placeholder="08:00 - 10:00 WIB" value={act.time}
                                onChange={event => handleEditActivity(selectedItineraryDay, idx, 'time', event.target.value)} />
                            </label>
                            <div className="activity-details">
                              <input aria-label={`Judul kegiatan ${idx + 1} hari ${selectedItineraryDay}`} placeholder="Nama kegiatan" value={act.title}
                                onChange={event => handleEditActivity(selectedItineraryDay, idx, 'title', event.target.value)} />
                            </div>
                            <div className="activity-actions">
                              <button type="button" disabled={idx === 0} aria-label={`Naikkan kegiatan ${idx + 1}`} onClick={() => handleMoveActivity(selectedItineraryDay, idx, -1)}><ArrowUp size={14} /> Naik</button>
                              <button type="button" disabled={idx === acts.length - 1} aria-label={`Turunkan kegiatan ${idx + 1}`} onClick={() => handleMoveActivity(selectedItineraryDay, idx, 1)}><ArrowDown size={14} /> Turun</button>
                              <button type="button" onClick={() => handleInsertActivity(selectedItineraryDay, idx)}><Plus size={14} /> Sisipkan setelahnya</button>
                              <button 
                                type="button"
                                className="delete-activity-btn" 
                                aria-label={`Hapus kegiatan ${idx + 1}`}
                                onClick={() => handleDeleteActivity(selectedItineraryDay, idx)}
                              >
                                <Trash2 size={14} /> Hapus
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
                          placeholder="Kegiatan, contoh: Penjemputan di titik kumpul" 
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
                        placeholder="Contoh: Transportasi AC PP, makan 3x, tiket masuk" 
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
                        placeholder="Contoh: Pengeluaran pribadi, tip pemandu" 
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
                <p className="section-subtitle">Lengkapi detail harga, kapasitas, jadwal keberangkatan, dan batas peserta</p>
                
                <div className="input-row-3">
                  <div className="input-group">
                    <label>Harga per Orang *</label>
                    <input 
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={price} 
                      onChange={(e) => handleDigitsOnlyInput(e.target.value, setPrice, 'Harga per orang', 'pricing')}
                      placeholder="Contoh: 1200000"
                    />
                  </div>
                  {requiresMinimumQuota && (
                    <div className="input-group">
                      <label>Kuota Minimal Open Trip (Min. 1) *</label>
                      <input
                        type="number"
                        min="1"
                        value={quotaMin}
                        onChange={(e) => setQuotaMin(e.target.value)}
                        placeholder="Contoh: 14"
                      />
                      {parseInt(quotaMin, 10) < 1 && (
                        <span className="field-error-text" style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                          ⚠️ Kuota minimal harus lebih besar dari 0 (minimal 1)
                        </span>
                      )}
                    </div>
                  )}
                  <div className="input-group">
                    <label>{requiresMinimumQuota ? 'Kuota Maksimal *' : 'Kapasitas Maksimal per Booking *'}</label>
                    <input 
                      type="number" 
                      min={requiresMinimumQuota ? (quotaMin || "1") : "1"}
                      value={quotaMax} 
                      onChange={(e) => setQuotaMax(e.target.value)}
                      placeholder="Contoh: 15"
                    />
                    {parseInt(quotaMax, 10) <= 0 ? (
                      <span className="field-error-text" style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                        ⚠️ Kuota maksimal tidak boleh 0 atau minus
                      </span>
                    ) : requiresMinimumQuota && parseInt(quotaMax, 10) < parseInt(quotaMin, 10) ? (
                      <span className="field-error-text" style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                        ⚠️ Kuota maksimal ({quotaMax}) harus &gt;= kuota minimal ({quotaMin})
                      </span>
                    ) : null}
                  </div>
                </div>

                {isOpenTripType(tripType) ? (<>
                <div className="input-group">
                  <label>Jadwal Keberangkatan (Durasi {duration} Hari) *</label>
                  <div className="input-range-row">
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '2px', display: 'block' }}>Tanggal Mulai</label>
                      <input 
                        type="date" 
                        min={todayStr}
                        value={startDate} 
                        onChange={(e) => handleStartDateChange(e.target.value)}
                        style={{ width: '100%', textAlign: 'left' }}
                      />
                    </div>
                    <span style={{ alignSelf: 'flex-end', marginBottom: '8px' }}>s/d</span>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '2px', display: 'block' }}>Tanggal Selesai</label>
                      <input 
                        type="date" 
                        min={startDate || todayStr}
                        value={endDate} 
                        onChange={(e) => {
                          const val = e.target.value;
                          setEndDate(val);
                          if (startDate && val) {
                            setSchedule(`${startDate} s/d ${val}`);
                          }
                        }}
                        style={{ width: '100%', textAlign: 'left' }}
                      />
                    </div>
                  </div>
                  {startDate && startDate < todayStr && (
                    <span className="field-error-text" style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                      ⚠️ Tanggal mulai tidak boleh tanggal yang sudah lewat dari hari ini
                    </span>
                  )}
                </div>

                </>) : (
                  <div className="input-group">
                    <label>Availability Calendar *</label>
                    <p style={{fontSize: 13, color: '#64748b'}}>Buka tanggal satu per satu atau beberapa rentang selama tiga bulan ke depan. Customer hanya bisa memesan periode yang seluruh harinya tersedia. Satu periode yang dipesan mengunci provider, berapa pun jumlah pesertanya. Durasi perjalanan {duration || 1} hari; pemesanan minimal H+7 ({addDays(todayStr, 7)}).</p>
                    <AvailabilityCalendar dates={availabilityDates} min={todayStr} max={latestDate} booked={bookedPackageDates} disabled={isBusy} onChange={(dates) => { setAvailabilityDates(dates); setStartDate(dates[0] || ''); setEndDate(dates[dates.length - 1] || ''); }} />
                  </div>
                )}

                {isOpenTripType(tripType) && <div className="input-group">
                  <label>Keterangan Jadwal Tambahan</label>
                  <input 
                    type="text" 
                    value={schedule} 
                    onChange={(e) => setSchedule(e.target.value)}
                    placeholder="Contoh: 2026-08-01 s/d 2026-08-05 (5 Hari)"
                  />
                </div>}

                <div className="input-group" style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '9px', cursor: 'pointer', width: 'fit-content' }}>
                    <input
                      type="checkbox"
                      checked={useMinimumBooking}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setUseMinimumBooking(checked);
                        setMinGuests(checked ? suggestedMinimumGuests(tripType) : '1');
                      }}
                      style={{ width: '16px', height: '16px', margin: 0 }}
                    />
                    Terapkan minimum peserta per booking
                  </label>
                  <span style={{ color: '#64748b', fontSize: '12px', marginTop: '5px' }}>
                    Jika tidak dicentang, pelanggan dapat memesan mulai dari 1 orang.
                  </span>
                </div>

                <div className="input-row-2">
                  {useMinimumBooking && (
                    <div className="input-group">
                      <label>Minimum Peserta (per Booking)</label>
                      <input
                        type="number"
                        min="1"
                        value={minGuests}
                        onChange={(e) => setMinGuests(e.target.value)}
                        placeholder="2"
                      />
                      {parseInt(minGuests, 10) < 1 && (
                        <span className="field-error-text" style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                          ⚠️ Minimum peserta per pemesanan minimal 1
                        </span>
                      )}
                    </div>
                  )}
                  <div className="input-group" style={!useMinimumBooking ? { gridColumn: '1 / -1' } : undefined}>
                    <label>Maksimum Peserta (per Booking)</label>
                    <input 
                      type="number" 
                      min={useMinimumBooking ? (minGuests || "1") : "1"}
                      max={quotaMax || undefined}
                      value={maxGuests} 
                      onChange={(e) => setMaxGuests(e.target.value)}
                      placeholder="12"
                    />
                    {parseInt(maxGuests, 10) < (useMinimumBooking ? parseInt(minGuests, 10) : 1) ? (
                      <span className="field-error-text" style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                        ⚠️ Maksimum peserta ({maxGuests}) harus &gt;= minimum peserta ({minGuests})
                      </span>
                    ) : parseInt(quotaMax, 10) > 0 && parseInt(maxGuests, 10) > parseInt(quotaMax, 10) ? (
                      <span className="field-error-text" style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                        ⚠️ Maksimum peserta per booking ({maxGuests}) tidak boleh melebihi kuota maksimal ({quotaMax})
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="input-group">
                  <label>Batas Usia</label>
                  <div className="input-range-row">
                    <input 
                      type="number" 
					  min="0"
					  step="1"
                      value={minAge} 
                      onChange={(e) => setMinAge(e.target.value)} 
                      placeholder="10"
                    />
                    <span>s/d</span>
                    <input 
                      type="number" 
					  min="0"
					  step="1"
                      value={maxAge} 
                      onChange={(e) => setMaxAge(e.target.value)} 
                      placeholder="65"
                    />
                    <span className="range-suffix">tahun</span>
                  </div>
				  {(Number(minAge) < 0 || Number(maxAge) < 0) && (
					<span className="field-error-text" style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
					  Umur tidak boleh bernilai minus.
					</span>
				  )}
				  {minAge !== '' && maxAge !== '' && Number(minAge) > Number(maxAge) && (
					<span className="field-error-text" style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
					  Umur maksimal tidak boleh lebih kecil dari umur minimal.
					</span>
				  )}
                </div>
              </div>
            )}

            {activeStep === 'photos' && (
              <div className="form-section-body animate-fade-in">
                <h3>Galeri Foto Paket ({packagePhotos.length}/20 Foto)</h3>
                <p className="section-subtitle">Unggah foto-foto terbaik destinasi untuk menarik minat pelanggan. Minimal 3 foto, maksimal 20 foto.</p>
                
                {packagePhotos.length < 3 && (
                  <div style={{ backgroundColor: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '10px', padding: '14px 18px', color: '#dc2626', fontWeight: 600, fontSize: '13.5px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <XCircle size={20} color="#ef4444" style={{ flexShrink: 0 }} />
                    <div>
                      <strong>Foto masih kurang, minimal 3 foto</strong>
                      <div style={{ fontSize: '12px', fontWeight: 500, marginTop: '2px', color: '#b91c1c' }}>
                        Saat ini baru ada {packagePhotos.length} foto. Wajib mengunggah minimal 3 foto (maksimal 20 foto).
                      </div>
                    </div>
                  </div>
                )}

                <div className="photos-tab-layout">
                  <div 
                    className="photos-upload-dropzone"
                    onClick={triggerPhotoUpload}
                    aria-busy={isUploadingPhoto}
                    style={{ borderColor: packagePhotos.length < 3 ? '#fecaca' : undefined, cursor: isBusy ? 'not-allowed' : undefined, opacity: isBusy && !isUploadingPhoto ? 0.6 : undefined }}
                  >
                    {isUploadingPhoto
                      ? <LoaderCircle size={32} color="var(--color-accent)" className="btn-spinner" aria-hidden="true" />
                      : <UploadCloud size={32} color="var(--color-accent)" />}
                    <div>
                      <strong>{isUploadingPhoto ? 'Mengunggah...' : 'Klik untuk Unggah Foto'}</strong>
                      <p>Format JPG, JPEG, PNG. Maksimal 2MB per foto (Batas: {packagePhotos.length}/20 foto).</p>
                    </div>
                    <input 
                      type="file" 
                      id="photo-file-input" 
                      style={{ display: 'none' }}
                      accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                      multiple
                      onChange={handlePhotoUpload}
                    />
                  </div>

                  <div className="photos-gallery-grid">
                    {packagePhotos.map((url, idx) => (
                      <div key={idx} className="gallery-photo-card">
                        <TripImage src={resolveMediaUrl(url)} alt={`Foto paket ${idx + 1}`} placeholderIconSize={20} placeholderShowText={false} />
                        {idx === 0 && <span className="gallery-cover-badge">Sampul</span>}
                        <button 
                          type="button"
                          className="delete-photo-btn"
                          onClick={() => handleDeletePhoto(idx)}
                          aria-label={`Hapus foto ${idx + 1}`}
                          title="Hapus foto"
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
          min-width: 0;
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
          grid-template-columns: 100px minmax(0, 1fr);
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
          min-width: 0;
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

        .activity-time-badge input, .activity-details input {
          width: 100%; min-width: 0; border: 1px solid #cbd5e1; border-radius: 6px;
          padding: 9px; background: white; font: inherit; font-size: 12px; color: #0f172a;
        }
        .activity-time-badge { font-size: 12px; }
        .activity-time-badge input { max-width: 240px; color: #0369a1; }
        .activity-details { padding: 0; border: none; }
        .activity-actions { display: flex; gap: 6px; flex-wrap: wrap; }
        .activity-actions button {
          display: inline-flex; align-items: center; gap: 4px; padding: 6px 8px;
          border: 1px solid #e2e8f0; border-radius: 6px; background: white; color: #475569; font-size: 11px;
        }
        .activity-actions button:disabled { opacity: .4; cursor: default; }
        .activity-actions .delete-activity-btn { color: #b91c1c; }
        .activity-time-badge input:focus-visible, .activity-details input:focus-visible, .activity-actions button:focus-visible {
          outline: 2px solid #0284c7; outline-offset: 2px;
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
          min-width: 0;
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

        .gallery-cover-badge {
          position: absolute;
          left: 8px;
          bottom: 8px;
          padding: 2px 8px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.75);
          color: #ffffff;
          font-size: 11px;
          font-weight: 700;
        }

        @media (max-width: 640px) {
          .form-content-card { padding: 20px; }
          .itinerary-tab-layout { grid-template-columns: minmax(0, 1fr); gap: 12px; }
          .itinerary-days-nav { flex-direction: row; flex-wrap: wrap; }
          .day-nav-btn { width: auto; }
          .day-activities-panel { padding: 14px; }
          .add-activity-inputs { grid-template-columns: minmax(0, 1fr); }
          .add-act-submit-btn { padding: 10px; }
          .photos-gallery-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .delete-photo-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 32px;
          height: 32px;
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
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>
    </div>
  );
};
