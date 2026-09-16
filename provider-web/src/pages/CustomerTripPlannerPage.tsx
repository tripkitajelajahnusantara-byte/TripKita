import React, { useState, useEffect, useRef } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { request } from '../utils/api';
import type { TripPlan, TripChecklistItem, TripSavingsLog, PackageItem } from '../types';
import { 
  Target, Calendar, Users, Wallet, CheckCircle2, Circle, Sparkles, Compass, 
  Trash2, Save, Info, Plus, ArrowLeft, HeartHandshake, ShieldCheck, Edit3
} from 'lucide-react';

const getTodayIsoDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateIndo = (dateStr: string) => {
  if (!dateStr) return 'Pilih tanggal trip';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

const formatRupiah = (val: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
};

const getMotivationContent = (pct: number, isExpired: boolean, dest: string) => {
  if (isExpired && pct < 100) {
    return {
      icon: '🗓️',
      title: 'Waktu Keberangkatan Tiba, Tapi Jangan Patah Semangat! 💪',
      text: `Target tabungan liburan ke ${dest} belum 100% terkumpul. Usahamu sudah luar biasa! Yuk sesuaikan ulang tanggal keberangkatanmu dan coba lagi! ✨`,
      bg: '#fffbe6',
      border: '#ffe58f',
      titleColor: '#d48806',
      textColor: '#784c00'
    };
  }

  if (pct >= 100) {
    return {
      icon: '🎉',
      title: 'Hore! Target Tabunganmu 100% Tercapai! 🎉',
      text: `Selamat! Tabungan untuk liburan impian ke ${dest} sudah terkumpul 100%. Yuk langsung cari dan pesan paket trip impianmu! 🚀`,
      bg: '#dcfce7',
      border: '#86efac',
      titleColor: '#15803d',
      textColor: '#166534'
    };
  }

  if (pct >= 75) {
    return {
      icon: '💪',
      title: 'Hampir Sampai! 75%+ Tabungan Terkumpul! 💪',
      text: `Ayo semangat! Tinggal sedikit lagi nih tabungan kamu terkumpul 100% untuk liburan impian ke ${dest}! Yuk sisihkan tabungan bulan ini! ✨`,
      bg: '#ecfdf5',
      border: '#a7f3d0',
      titleColor: '#047857',
      textColor: '#065f46'
    };
  }

  if (pct >= 50) {
    return {
      icon: '⚡',
      title: 'Setengah Jalan Tercapai! 50% Tabungan Terkumpul! ⚡',
      text: `Hebat! Kamu sudah berhasil mengumpulkan setengah dari target budget liburan ke ${dest}. Pertahankan semangatmu! 🔥`,
      bg: '#e0e7ff',
      border: '#c7d2fe',
      titleColor: '#4338ca',
      textColor: '#3730a3'
    };
  }

  if (pct >= 25) {
    return {
      icon: '🔥',
      title: 'Awal yang Bagus! 25% Tabungan Sudah Terkumpul! 🔥',
      text: `Kerja bagus! Tabungan liburan ke ${dest} sudah mulai terkumpul. Tetap konsisten menyisihkan tabungan tiap bulan ya! ✨`,
      bg: '#e0f2fe',
      border: '#bae6fd',
      titleColor: '#0284c7',
      textColor: '#0369a1'
    };
  }

  // 0% - 24% Progress
  return {
    icon: '🌱',
    title: 'Langkah Awal Memulai Perjalanan Impian! 🚀',
    text: `Setiap perjalanan besar dimulai dari langkah kecil. Rencana trip impianmu ke ${dest} baru saja dimulai. Yuk konsisten sisihkan tabungan bulan ini! ✨`,
    bg: '#e6f4f4',
    border: '#b2e0e0',
    titleColor: '#0f8b8d',
    textColor: '#134e4a'
  };
};

const CATALOG_PACKAGES: PackageItem[] = [
  {
    id: 'pkg_palu',
    name: 'Open Trip Palu & Teluk Tomini 3D2N',
    destination: 'Palu, Sulawesi Tengah',
    price: 'Rp 1.450.000',
    quota: '10 Pax',
    schedule: 'Tersedia tiap weekend',
    status: 'Aktif',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=600',
    tripType: 'Open Trip'
  },
  {
    id: 'pkg_rajaampat',
    name: 'Private Trip Wisata Raja Ampat 4D3N',
    destination: 'Raja Ampat, Papua Barat',
    price: 'Rp 3.850.000',
    quota: '8 Pax',
    schedule: 'Fleksibel',
    status: 'Aktif',
    rating: 5.0,
    image: 'https://images.unsplash.com/photo-1516690561799-46d8f74f9abf?w=600',
    tripType: 'Private Trip'
  },
  {
    id: 'pkg_bali',
    name: 'Honeymoon Romantic Bali Villa 3D2N',
    destination: 'Denpasar & Ubud, Bali',
    price: 'Rp 2.950.000',
    quota: '2 Pax',
    schedule: 'Fleksibel',
    status: 'Aktif',
    rating: 5.0,
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600',
    tripType: 'Honeymoon'
  },
  {
    id: 'pkg_bromo',
    name: 'Open Trip Gunung Bromo Sunrise',
    destination: 'Probolinggo, Jawa Timur',
    price: 'Rp 350.000',
    quota: '15 Pax',
    schedule: 'Setiap Hari',
    status: 'Aktif',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=600',
    tripType: 'Open Trip'
  },
  {
    id: 'pkg_tidung',
    name: 'Open Trip Pulau Tidung Kepulauan Seribu',
    destination: 'Kepulauan Seribu, Jakarta',
    price: 'Rp 450.000',
    quota: '12 Pax',
    schedule: 'Setiap Sabtu-Minggu',
    status: 'Aktif',
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600',
    tripType: 'Open Trip'
  },
  {
    id: 'pkg_cilember',
    name: 'Trip Curug Cilember & Puncak',
    destination: 'Bogor, Jawa Barat',
    price: 'Rp 275.000',
    quota: '10 Pax',
    schedule: 'Weekend',
    status: 'Aktif',
    rating: 4.6,
    image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=600',
    tripType: 'Open Trip'
  },
  {
    id: 'pkg_bandung',
    name: 'Bandung City Tour & Lembang',
    destination: 'Bandung, Jawa Barat',
    price: 'Rp 420.000',
    quota: '15 Pax',
    schedule: 'Weekend',
    status: 'Aktif',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1596402184320-417e7178b2cd?w=600',
    tripType: 'Open Trip'
  },
  {
    id: 'pkg_jogja',
    name: 'Family Vacation Yogyakarta & Borobudur',
    destination: 'Yogyakarta, DI Yogyakarta',
    price: 'Rp 850.000',
    quota: '15 Pax',
    schedule: 'Fleksibel',
    status: 'Aktif',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1596402184320-417e7178b2cd?w=600',
    tripType: 'Family'
  }
];

export const CustomerTripPlannerPage: React.FC = () => {
  const { customerProfile, navigateTo } = useNavigation();

  // Storage key linked to customer account
  const storageKey = customerProfile 
    ? `tementrip_plans_cust_${customerProfile.id || customerProfile.email}`
    : 'tementrip_plans_guest';

  // Account Plans Array (Max 10 plans)
  const [plans, setPlans] = useState<TripPlan[]>([]);
  const [activePlan, setActivePlan] = useState<TripPlan | null>(null);
  
  // Page view modes: 'LIST' (home list), 'FORM' (create/edit form), 'DETAIL' (full detail dashboard)
  const [viewState, setViewState] = useState<'LIST' | 'FORM' | 'DETAIL'>('LIST');
  const [isEditingExisting, setIsEditingExisting] = useState(false);

  // Form input state
  const [destination, setDestination] = useState('');
  const [targetDate, setTargetDate] = useState(getTodayIsoDate());
  const [participants, setParticipants] = useState<number>(2);
  const [targetBudget, setTargetBudget] = useState<string>('');

  // Date input ref
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Savings log modal state (for Add & Edit)
  const [showSavingsModal, setShowSavingsModal] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [savingsInput, setSavingsInput] = useState<string>('');
  const [savingsNote, setSavingsNote] = useState<string>('');

  // Manual Checklist state (Add & Edit)
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [editingChecklistLabel, setEditingChecklistLabel] = useState('');

  // Automated item info modal
  const [autoItemModalInfo, setAutoItemModalInfo] = useState<string | null>(null);

  // Matching packages
  const [matchingPackages, setMatchingPackages] = useState<PackageItem[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);

  // Helper for customer identity
  const currentUserName = (customerProfile as any)?.name || (customerProfile as any)?.fullName || customerProfile?.picName || 'Customer';
  const currentUserEmail = customerProfile?.email || 'customer@tementrip.com';

  // Load saved plans from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed: TripPlan[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPlans(parsed);
          setViewState('LIST');
        } else {
          setPlans([]);
          setViewState('FORM');
        }
      } catch (e) {
        console.error('Failed to parse trip plans', e);
        setPlans([]);
        setViewState('FORM');
      }
    } else {
      setPlans([]);
      setViewState('FORM');
    }
  }, [storageKey]);

  // Helper to persist plans array
  const savePlansToStorage = (updatedPlans: TripPlan[]) => {
    setPlans(updatedPlans);
    localStorage.setItem(storageKey, JSON.stringify(updatedPlans));
  };

  // Filter packages matching destination
  const filterMatchingPackages = (allList: PackageItem[], destInput: string) => {
    if (!destInput) return [];
    const query = destInput.toLowerCase().trim();
    return allList.filter(pkg => {
      const pkgDest = (pkg.destination || '').toLowerCase();
      const pkgName = (pkg.name || '').toLowerCase();
      return pkgDest.includes(query) || pkgName.includes(query) || query.includes(pkgDest);
    });
  };

  // Fetch matching packages when active plan exists in DETAIL view
  useEffect(() => {
    if (activePlan && activePlan.destination && viewState === 'DETAIL') {
      setLoadingPackages(true);
      request('/public/packages')
        .then((data: any) => {
          const apiList: PackageItem[] = Array.isArray(data) ? data : (data?.data || []);
          const combined = [...apiList];
          CATALOG_PACKAGES.forEach(catPkg => {
            if (!combined.some(p => p.id === catPkg.id || p.name === catPkg.name)) {
              combined.push(catPkg);
            }
          });

          const filtered = filterMatchingPackages(combined, activePlan.destination);
          setMatchingPackages(filtered);
        })
        .catch(err => {
          console.error('Error fetching packages:', err);
          const filtered = filterMatchingPackages(CATALOG_PACKAGES, activePlan.destination);
          setMatchingPackages(filtered);
        })
        .finally(() => setLoadingPackages(false));
    }
  }, [activePlan?.destination, viewState]);

  // Start creating a new plan from Home List
  const handleStartNewPlan = () => {
    if (plans.length >= 10) {
      alert('Batas maksimal 10 rencana trip telah tercapai. Silakan hapus rencana lama terlebih dahulu jika ingin membuat rencana baru.');
      return;
    }
    setDestination('');
    setTargetDate(getTodayIsoDate());
    setParticipants(2);
    setTargetBudget('');
    setIsEditingExisting(false);
    setActivePlan(null);
    setViewState('FORM');
  };

  // Start editing an existing plan from Home List
  const handleStartEditPlan = (planToEdit: TripPlan) => {
    setActivePlan(planToEdit);
    setDestination(planToEdit.destination);
    setTargetDate(planToEdit.targetMonth || getTodayIsoDate());
    setParticipants(planToEdit.participants);
    setTargetBudget(planToEdit.targetBudget.toString());
    setIsEditingExisting(true);
    setViewState('FORM');
  };

  // Step 1 Form Handler: Proceed to Detail View
  const handleProceedToDetail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim()) {
      alert('Silakan isi destinasi impian Anda.');
      return;
    }
    const numBudget = parseInt(targetBudget.replace(/\D/g, ''), 10);
    if (isNaN(numBudget) || numBudget <= 0) {
      alert('Silakan masukkan target budget yang valid.');
      return;
    }

    const formattedDateLabel = formatDateIndo(targetDate);

    // Initial default checklist with 5 automated system milestones (0%, 25%, 50%, 75%, 100%)
    const defaultChecklist: TripChecklistItem[] = [
      { id: '1', label: 'Tentukan Destinasi & Target Budget Liburan', completed: true },
      { id: '2', label: 'Capai 25% Tabungan Perjalanan', completed: false },
      { id: '3', label: 'Capai 50% Tabungan Perjalanan', completed: false },
      { id: '4', label: 'Capai 75% Tabungan Perjalanan', completed: false },
      { id: '5', label: 'Capai 100% Target Tabungan', completed: false },
      { id: '6', label: 'Cari & Pesan Paket Open Trip di TemenTrip', completed: false },
      { id: '7', label: 'Siapkan Barang Bawaan & Pakaian Liburan', completed: false },
      { id: '8', label: 'Siap Berangkat & Nikmati Liburan! 🥳', completed: false },
    ];

    if (isEditingExisting && activePlan) {
      const updated: TripPlan = {
        ...activePlan,
        destination: destination.trim(),
        targetMonth: targetDate,
        targetMonthLabel: formattedDateLabel,
        participants: Number(participants) || 1,
        targetBudget: numBudget,
        userName: currentUserName,
        userEmail: currentUserEmail,
        updatedAt: new Date().toISOString()
      };
      setActivePlan(updated);
    } else {
      const newPlanObj: TripPlan = {
        id: `plan_${Date.now()}`,
        destination: destination.trim(),
        targetMonth: targetDate,
        targetMonthLabel: formattedDateLabel,
        participants: Number(participants) || 1,
        targetBudget: numBudget,
        savedAmount: 0,
        checklist: defaultChecklist,
        savingsLogs: [],
        status: 'DRAFT',
        userName: currentUserName,
        userEmail: currentUserEmail,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setActivePlan(newPlanObj);
    }

    setViewState('DETAIL');
  };

  // Permanently Save Active Plan (Step 2 Bottom Action)
  const handleSavePlanPermanent = () => {
    if (!activePlan) return;
    const finalPlan: TripPlan = {
      ...activePlan,
      status: 'SAVED',
      userName: currentUserName,
      userEmail: currentUserEmail,
      updatedAt: new Date().toISOString()
    };

    let updatedList: TripPlan[];
    const exists = plans.some(p => p.id === finalPlan.id);
    if (exists) {
      updatedList = plans.map(p => p.id === finalPlan.id ? finalPlan : p);
    } else {
      updatedList = [finalPlan, ...plans];
    }

    savePlansToStorage(updatedList);
    setActivePlan(finalPlan);
    alert(`Rencana trip ke "${finalPlan.destination}" berhasil disimpan!`);
    setViewState('LIST');
  };

  // Batalkan Rencana Trip (Point 4: Confirms and deletes/cancels plan)
  const handleCancelPlan = () => {
    if (!activePlan) {
      if (plans.length > 0) setViewState('LIST');
      else handleStartNewPlan();
      return;
    }

    if (window.confirm(`Apakah Anda yakin ingin membatalkan rencana trip ke "${activePlan.destination}"? Tindakan ini akan menghapus semua data yang sudah diisi.`)) {
      // Remove from plans list if existing
      const filtered = plans.filter(p => p.id !== activePlan.id);
      savePlansToStorage(filtered);

      setActivePlan(null);
      setDestination('');
      setTargetDate(getTodayIsoDate());
      setParticipants(2);
      setTargetBudget('');

      if (filtered.length > 0) {
        setViewState('LIST');
      } else {
        handleStartNewPlan();
      }
    }
  };

  // Delete Plan from List
  const handleDeletePlanFromList = (e: React.MouseEvent, planId: string, destName: string) => {
    e.stopPropagation();
    if (!window.confirm(`Apakah Anda yakin ingin menghapus rencana trip ke "${destName}"?`)) {
      return;
    }

    const filtered = plans.filter(p => p.id !== planId);
    savePlansToStorage(filtered);

    if (activePlan?.id === planId) {
      setActivePlan(null);
    }

    if (filtered.length === 0) {
      handleStartNewPlan();
    }
  };

  // Save active plan as DRAFT automatically when navigating to packages
  const autoSaveDraftAndNavigate = (targetRoute: 'cari-trip' | 'paket-detail') => {
    if (activePlan) {
      const draftPlan: TripPlan = {
        ...activePlan,
        status: activePlan.status || 'DRAFT',
        userName: currentUserName,
        userEmail: currentUserEmail,
        updatedAt: new Date().toISOString()
      };

      let updatedList: TripPlan[];
      const exists = plans.some(p => p.id === draftPlan.id);
      if (exists) {
        updatedList = plans.map(p => p.id === draftPlan.id ? draftPlan : p);
      } else {
        updatedList = [draftPlan, ...plans];
      }
      savePlansToStorage(updatedList);
    }
    navigateTo(targetRoute);
  };

  // Add or Edit Savings Log (Point 3)
  const handleOpenSavingsModal = (log?: TripSavingsLog) => {
    if (log) {
      setEditingLogId(log.id);
      setSavingsInput(new Intl.NumberFormat('id-ID').format(log.amount));
      setSavingsNote(log.note || '');
    } else {
      setEditingLogId(null);
      setSavingsInput('');
      setSavingsNote('');
    }
    setShowSavingsModal(true);
  };

  const handleSaveSavings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePlan) return;
    const amount = parseInt(savingsInput.replace(/\D/g, ''), 10);
    if (isNaN(amount) || amount <= 0) {
      alert('Masukkan nominal tabungan yang valid.');
      return;
    }

    let updatedLogs: TripSavingsLog[];
    if (editingLogId) {
      updatedLogs = activePlan.savingsLogs.map(l => 
        l.id === editingLogId ? { ...l, amount, note: savingsNote.trim() || 'Tabungan bulanan' } : l
      );
    } else {
      const newLog: TripSavingsLog = {
        id: `log_${Date.now()}`,
        date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        amount,
        note: savingsNote.trim() || 'Tabungan bulanan'
      };
      updatedLogs = [newLog, ...activePlan.savingsLogs];
    }

    const newSavedTotal = updatedLogs.reduce((acc, curr) => acc + curr.amount, 0);

    const updatedPlan: TripPlan = {
      ...activePlan,
      savedAmount: newSavedTotal,
      savingsLogs: updatedLogs,
      updatedAt: new Date().toISOString()
    };

    setActivePlan(updatedPlan);

    if (plans.some(p => p.id === updatedPlan.id)) {
      const updatedList = plans.map(p => p.id === updatedPlan.id ? updatedPlan : p);
      savePlansToStorage(updatedList);
    }

    setShowSavingsModal(false);
    setSavingsInput('');
    setSavingsNote('');
    setEditingLogId(null);
  };

  // Delete Savings Log (Point 3)
  const handleDeleteSavingsLog = (e: React.MouseEvent, logId: string) => {
    e.stopPropagation();
    if (!activePlan) return;
    if (!window.confirm('Apakah Anda yakin ingin menghapus catatan tabungan ini?')) return;

    const updatedLogs = activePlan.savingsLogs.filter(l => l.id !== logId);
    const newSavedTotal = updatedLogs.reduce((acc, curr) => acc + curr.amount, 0);

    const updatedPlan: TripPlan = {
      ...activePlan,
      savedAmount: newSavedTotal,
      savingsLogs: updatedLogs,
      updatedAt: new Date().toISOString()
    };

    setActivePlan(updatedPlan);

    if (plans.some(p => p.id === updatedPlan.id)) {
      const updatedList = plans.map(p => p.id === updatedPlan.id ? updatedPlan : p);
      savePlansToStorage(updatedList);
    }
  };

  // Toggle Manual Checklist Item (1,2,3,4,5 show automated info modal)
  const handleToggleChecklist = (id: string) => {
    if (!activePlan) return;

    if (id === '1') {
      setAutoItemModalInfo('Item "Tentukan Destinasi & Target Budget Liburan" otomatis tercentang ketika rencana trip impian berhasil dibuat.');
      return;
    }
    if (id === '2') {
      setAutoItemModalInfo('Item "Capai 25% Tabungan Perjalanan" otomatis tercentang oleh sistem ketika total tabungan terkumpul sudah mencapai 25% dari target budget.');
      return;
    }
    if (id === '3') {
      setAutoItemModalInfo('Item "Capai 50% Tabungan Perjalanan" otomatis tercentang oleh sistem ketika total tabungan terkumpul sudah mencapai 50% dari target budget.');
      return;
    }
    if (id === '4') {
      setAutoItemModalInfo('Item "Capai 75% Tabungan Perjalanan" otomatis tercentang oleh sistem ketika total tabungan terkumpul sudah mencapai 75% dari target budget.');
      return;
    }
    if (id === '5') {
      setAutoItemModalInfo('Item "Capai 100% Target Tabungan" otomatis tercentang oleh sistem ketika total tabungan terkumpul sudah mencapai 100% dari target budget.');
      return;
    }

    const updatedChecklist = activePlan.checklist.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    const updatedPlan: TripPlan = { ...activePlan, checklist: updatedChecklist };
    setActivePlan(updatedPlan);

    if (plans.some(p => p.id === updatedPlan.id)) {
      const updatedList = plans.map(p => p.id === updatedPlan.id ? updatedPlan : p);
      savePlansToStorage(updatedList);
    }
  };

  // Add Custom Checklist Item
  const handleAddChecklistItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePlan || !newChecklistItem.trim()) return;
    const newItem: TripChecklistItem = {
      id: `chk_${Date.now()}`,
      label: newChecklistItem.trim(),
      completed: false
    };
    const updatedPlan: TripPlan = {
      ...activePlan,
      checklist: [...activePlan.checklist, newItem]
    };
    setActivePlan(updatedPlan);

    if (plans.some(p => p.id === updatedPlan.id)) {
      const updatedList = plans.map(p => p.id === updatedPlan.id ? updatedPlan : p);
      savePlansToStorage(updatedList);
    }
    setNewChecklistItem('');
  };

  // Edit Manual Checklist Item (Point 3)
  const handleSaveEditChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePlan || !editingChecklistId || !editingChecklistLabel.trim()) return;

    const updatedChecklist = activePlan.checklist.map(item =>
      item.id === editingChecklistId ? { ...item, label: editingChecklistLabel.trim() } : item
    );
    const updatedPlan: TripPlan = { ...activePlan, checklist: updatedChecklist };
    setActivePlan(updatedPlan);

    if (plans.some(p => p.id === updatedPlan.id)) {
      const updatedList = plans.map(p => p.id === updatedPlan.id ? updatedPlan : p);
      savePlansToStorage(updatedList);
    }
    setEditingChecklistId(null);
    setEditingChecklistLabel('');
  };

  // Delete Manual Checklist Item (Point 3)
  const handleDeleteChecklistItem = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    if (!activePlan) return;
    if (!window.confirm('Apakah Anda yakin ingin menghapus item checklist ini?')) return;

    const updatedChecklist = activePlan.checklist.filter(item => item.id !== itemId);
    const updatedPlan: TripPlan = { ...activePlan, checklist: updatedChecklist };
    setActivePlan(updatedPlan);

    if (plans.some(p => p.id === updatedPlan.id)) {
      const updatedList = plans.map(p => p.id === updatedPlan.id ? updatedPlan : p);
      savePlansToStorage(updatedList);
    }
  };

  // Calculate percentages
  const savedPercentage = activePlan ? Math.min(100, Math.round((activePlan.savedAmount / activePlan.targetBudget) * 100)) : 0;
  const remainingBudget = activePlan ? Math.max(0, activePlan.targetBudget - activePlan.savedAmount) : 0;

  // Dynamic status evaluation for checklist items (0%, 25%, 50%, 75%, 100%)
  const isItemCompleted = (item: TripChecklistItem): boolean => {
    if (!activePlan) return item.completed;
    if (item.id === '1') return true;
    if (item.id === '2') return activePlan.savedAmount >= (activePlan.targetBudget * 0.25);
    if (item.id === '3') return activePlan.savedAmount >= (activePlan.targetBudget * 0.50);
    if (item.id === '4') return activePlan.savedAmount >= (activePlan.targetBudget * 0.75);
    if (item.id === '5') return activePlan.savedAmount >= activePlan.targetBudget;
    return item.completed;
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '32px 16px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        
        {/* Header Title Section */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Target size={28} color="#0f8b8d" /> Rencana Trip &amp; Target Tabungan
          </h1>
          <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0 }}>
            Susun liburan impianmu bersama pasangan atau teman, atur target tabungan bulanan, dan wujudkan trip impian tanpa beban.
          </p>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: HOME LIST PAGE (Tampilan Awal Daftar Rencana Trip Saya) */}
        {/* ========================================================================= */}
        {viewState === 'LIST' && (
          <div>
            {/* Banner Promotional Poster - High Contrast Vibrant Styling (Point 2) */}
            <div 
              style={{ 
                backgroundImage: 'linear-gradient(135deg, #0d4b56 0%, #0f8b8d 50%, #0284c7 100%)', 
                borderRadius: '24px', 
                padding: '28px 32px', 
                color: '#ffffff', 
                marginBottom: '28px',
                boxShadow: '0 12px 30px rgba(15,139,141,0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: '24px'
              }}
            >
              <div style={{ flex: 1 }}>
                <span 
                  style={{ 
                    backgroundColor: '#fbbf24', 
                    color: '#0f172a', 
                    fontSize: '11px', 
                    fontWeight: '800', 
                    padding: '5px 14px', 
                    borderRadius: '20px', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.5px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                  }}
                >
                  <HeartHandshake size={14} /> Liburan Impian Tanpa Beban
                </span>
                
                <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#ffffff', margin: '14px 0 8px 0', lineHeight: 1.3, textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                  Rencanakan Liburan Seru Bersama Pasangan, Teman, atau Keluarga! 🏝️✨
                </h2>
                
                <p style={{ fontSize: '14px', color: '#f0f9ff', margin: 0, lineHeight: 1.6, fontWeight: '500', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                  Susun target budget dan tabungan bulananmu mulai dari sekarang. Nikmati perjalanan impian tanpa perlu risau masalah keuangan!
                </p>
              </div>
            </div>

            {/* List of Saved/Draft Plans Section (Points 1 & 6) */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '28px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', marginBottom: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Compass size={20} color="#0f8b8d" /> Daftar Rencana Trip Saya ({plans.length}/10)
                </h2>
              </div>

              {plans.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
                  Belum ada rencana trip yang dibuat.<br />
                  <button
                    onClick={handleStartNewPlan}
                    style={{
                      marginTop: '16px',
                      backgroundColor: '#0f8b8d',
                      color: '#ffffff',
                      border: 'none',
                      padding: '10px 22px',
                      borderRadius: '12px',
                      fontSize: '13.5px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(15,139,141,0.25)'
                    }}
                  >
                    + Buat Rencana Trip Baru
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                    {plans.map(p => {
                      const pct = Math.min(100, Math.round((p.savedAmount / p.targetBudget) * 100));
                      const remaining = Math.max(0, p.targetBudget - p.savedAmount);
                      return (
                        <div
                          key={p.id}
                          style={{
                            backgroundColor: '#ffffff',
                            borderRadius: '20px',
                            border: '1px solid #e2e8f0',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            boxShadow: '0 6px 18px rgba(0,0,0,0.04)',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                          }}
                        >
                          <div style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                              <span style={{ fontSize: '11px', fontWeight: '800', padding: '4px 10px', borderRadius: '12px', backgroundColor: p.status === 'SAVED' ? '#dcfce7' : '#fef3c7', color: p.status === 'SAVED' ? '#166534' : '#92400e' }}>
                                {p.status === 'SAVED' ? 'Tersimpan' : 'Draft'}
                              </span>
                              <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f8b8d', backgroundColor: '#e6f4f4', padding: '3px 10px', borderRadius: '12px' }}>
                                {pct}% Terkumpul
                              </span>
                            </div>

                            <h3 style={{ fontSize: '19px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0' }}>
                              🏝️ {p.destination}
                            </h3>

                            <div style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '14px', display: 'flex', gap: '16px', fontWeight: '600' }}>
                              <span><Calendar size={13} style={{ display: 'inline', verticalAlign: '-2px', color: '#0f8b8d' }} /> {p.targetMonthLabel}</span>
                              <span><Users size={13} style={{ display: 'inline', verticalAlign: '-2px', color: '#0f8b8d' }} /> {p.participants} Peserta</span>
                            </div>

                            {/* Financial Stats Summary Box */}
                            <div style={{ backgroundColor: '#f8fafc', borderRadius: '14px', padding: '12px', border: '1px solid #f1f5f9', marginBottom: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              <div>
                                <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Terkumpul</div>
                                <div style={{ fontSize: '13px', fontWeight: '800', color: '#10b981', marginTop: '2px' }}>{formatRupiah(p.savedAmount)}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Target Budget</div>
                                <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{formatRupiah(p.targetBudget)}</div>
                              </div>
                              <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #e2e8f0', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Sisa Dibutuhkan:</span>
                                <strong style={{ fontSize: '12px', color: remaining > 0 ? '#ef4444' : '#10b981', fontWeight: '800' }}>
                                  {remaining > 0 ? formatRupiah(remaining) : 'Lunas'}
                                </strong>
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', backgroundColor: '#0f8b8d', borderRadius: '8px', transition: 'width 0.4s ease' }} />
                            </div>
                          </div>

                          {/* Plan Card Actions (Point 1 & Edit Icon Fix) */}
                          <div style={{ backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <button
                              onClick={() => {
                                setActivePlan(p);
                                setViewState('DETAIL');
                              }}
                              style={{
                                backgroundColor: '#0f8b8d',
                                color: '#ffffff',
                                border: 'none',
                                padding: '9px 16px',
                                borderRadius: '10px',
                                fontSize: '12.5px',
                                fontWeight: '800',
                                cursor: 'pointer',
                                flex: 1,
                                boxShadow: '0 2px 8px rgba(15,139,141,0.2)'
                              }}
                            >
                              Lihat Detail &rarr;
                            </button>

                            {/* Edit Icon (Pencil) & Hapus Icon */}
                            <button
                              onClick={() => handleStartEditPlan(p)}
                              title="Edit Rencana"
                              style={{
                                backgroundColor: '#ffffff',
                                border: '1px solid #cbd5e1',
                                padding: '9px 12px',
                                borderRadius: '10px',
                                fontSize: '12px',
                                color: '#334155',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Edit3 size={15} color="#0f8b8d" />
                            </button>

                            <button
                              onClick={(e) => handleDeletePlanFromList(e, p.id, p.destination)}
                              title="Hapus Rencana"
                              style={{
                                backgroundColor: '#fef2f2',
                                border: '1px solid #fecaca',
                                padding: '9px 12px',
                                borderRadius: '10px',
                                fontSize: '12px',
                                color: '#ef4444',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Trash2 size={15} color="#ef4444" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Point 6: Option to add new plan appears UNDER the first list once saved */}
                  {plans.length < 10 && (
                    <div style={{ textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                      <button
                        onClick={handleStartNewPlan}
                        style={{
                          backgroundColor: '#0f8b8d',
                          color: '#ffffff',
                          border: 'none',
                          padding: '12px 24px',
                          borderRadius: '12px',
                          fontSize: '13.5px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          boxShadow: '0 4px 14px rgba(15,139,141,0.25)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <Plus size={16} /> + Buat Rencana Baru ({plans.length}/10)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: FORM PAGE (Form Buat / Edit Rencana Trip) */}
        {/* ========================================================================= */}
        {viewState === 'FORM' && (
          <div>
            {/* Banner Promotional Header */}
            <div 
              style={{ 
                backgroundImage: 'linear-gradient(135deg, #0d4b56 0%, #0f8b8d 50%, #0284c7 100%)', 
                borderRadius: '24px', 
                padding: '28px 32px', 
                color: '#ffffff', 
                marginBottom: '28px',
                boxShadow: '0 12px 30px rgba(15,139,141,0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: '24px'
              }}
            >
              <div style={{ flex: 1 }}>
                <span 
                  style={{ 
                    backgroundColor: '#fbbf24', 
                    color: '#0f172a', 
                    fontSize: '11px', 
                    fontWeight: '800', 
                    padding: '5px 14px', 
                    borderRadius: '20px', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.5px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                  }}
                >
                  <HeartHandshake size={14} /> Liburan Impian Tanpa Beban
                </span>
                
                <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#ffffff', margin: '14px 0 8px 0', lineHeight: 1.3, textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                  Rencanakan Liburan Seru Bersama Pasangan, Teman, atau Keluarga! 🏝️✨
                </h2>
                
                <p style={{ fontSize: '14px', color: '#f0f9ff', margin: 0, lineHeight: 1.6, fontWeight: '500', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                  Susun target budget dan tabungan bulananmu mulai dari sekarang. Nikmati perjalanan impian tanpa perlu risau masalah keuangan!
                </p>
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '28px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Compass size={20} color="#0f8b8d" /> {isEditingExisting ? 'Edit Rencana Trip' : 'Buat Rencana Trip Impian Baru'}
              </h2>

              <form onSubmit={handleProceedToDetail} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
                
                {/* Destinasi */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
                    Destinasi Impian <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Palu, Raja Ampat, Bali, Bandung..."
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '14px',
                      fontWeight: '600',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    required
                  />
                </div>

                {/* Rencana Waktu Keberangkatan dengan Kalender Picker */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
                    Rencana Waktu Keberangkatan <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div 
                    onClick={() => {
                      if (dateInputRef.current) {
                        if (typeof dateInputRef.current.showPicker === 'function') {
                          dateInputRef.current.showPicker();
                        } else {
                          dateInputRef.current.focus();
                        }
                      }
                    }}
                    style={{ position: 'relative', width: '100%', cursor: 'pointer' }}
                  >
                    <div
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: targetDate ? '#0f172a' : '#94a3b8',
                        backgroundColor: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        boxSizing: 'border-box'
                      }}
                    >
                      <span>{formatDateIndo(targetDate)}</span>
                      <Calendar size={18} color="#0f8b8d" />
                    </div>
                    <input 
                      ref={dateInputRef}
                      type="date" 
                      min={getTodayIsoDate()}
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0,
                        cursor: 'pointer'
                      }}
                      required
                    />
                  </div>
                  <span style={{ fontSize: '10.5px', color: '#94a3b8', display: 'block', marginTop: '4px' }}>
                    Tanggal sebelum hari ini di-lock secara otomatis.
                  </span>
                </div>

                {/* Jumlah Peserta */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
                    Jumlah Peserta (Orang) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={participants}
                    onChange={(e) => setParticipants(parseInt(e.target.value, 10) || 1)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '14px',
                      fontWeight: '600',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    required
                  />
                </div>

                {/* Total Target Budget */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
                    Total Target Budget (Rp) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 5.000.000"
                    value={targetBudget}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setTargetBudget(raw ? new Intl.NumberFormat('id-ID').format(parseInt(raw, 10)) : '');
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '14px',
                      fontWeight: '700',
                      color: '#0f8b8d',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    required
                  />
                </div>

                {/* Button Next Step matching Item 1 */}
                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (plans.length > 0) setViewState('LIST');
                      else handleStartNewPlan();
                    }}
                    style={{
                      padding: '12px 20px',
                      borderRadius: '12px',
                      border: 'none',
                      backgroundColor: '#f1f5f9',
                      color: '#64748b',
                      fontSize: '13.5px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    Batal
                  </button>
                  
                  <button
                    type="submit"
                    style={{
                      padding: '12px 26px',
                      borderRadius: '12px',
                      border: 'none',
                      backgroundColor: '#0f8b8d',
                      color: '#ffffff',
                      fontSize: '14px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(15,139,141,0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    Lanjut ke Detail &amp; Rencana Trip &rarr;
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: DETAIL PAGE (Point 5: CLEAN DETAIL DASHBOARD WITHOUT HEADER BUTTONS) */}
        {/* ========================================================================= */}
        {viewState === 'DETAIL' && activePlan && (
          <div>
            {/* Navigation Back Link to Home List */}
            <div style={{ marginBottom: '16px' }}>
              <button
                onClick={() => setViewState('LIST')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0f8b8d',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <ArrowLeft size={16} /> &larr; Kembali ke Daftar Rencana Trip Saya
              </button>
            </div>

            {/* Top Overview Cards */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.04)', marginBottom: '24px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ backgroundColor: '#e6f4f4', color: '#0f8b8d', fontSize: '11px', fontWeight: '800', padding: '4px 10px', borderRadius: '20px', textTransform: 'uppercase' }}>
                      Target Liburan
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: '800', padding: '4px 10px', borderRadius: '20px', backgroundColor: activePlan.status === 'SAVED' ? '#dcfce7' : '#fef3c7', color: activePlan.status === 'SAVED' ? '#166534' : '#92400e' }}>
                      Status: {activePlan.status === 'SAVED' ? 'Tersimpan' : 'Draft (Belum Disimpan)'}
                    </span>
                  </div>
                  <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '8px 0 2px 0' }}>
                    {activePlan.destination}
                  </h2>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12.5px', color: '#64748b', fontWeight: '600' }}>
                    <span><Calendar size={14} style={{ display: 'inline', verticalAlign: '-2px', color: '#0f8b8d' }} /> {activePlan.targetMonthLabel}</span>
                    <span><Users size={14} style={{ display: 'inline', verticalAlign: '-2px', color: '#0f8b8d' }} /> {activePlan.participants} Peserta</span>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenSavingsModal()}
                  style={{
                    backgroundColor: '#0f8b8d',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '14px',
                    fontSize: '13.5px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(15,139,141,0.3)'
                  }}
                >
                  <Wallet size={16} /> + Catat Tabungan Bulan Ini
                </button>
              </div>

              {/* Savings Progress Bar */}
              <div style={{ backgroundColor: '#f8fafc', borderRadius: '16px', padding: '18px', border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '800', color: '#334155', marginBottom: '8px' }}>
                  <span>📈 Progres Tabungan</span>
                  <span style={{ color: '#0f8b8d' }}>{savedPercentage}%</span>
                </div>
                
                <div style={{ width: '100%', height: '10px', backgroundColor: '#e2e8f0', borderRadius: '10px', overflow: 'hidden', marginBottom: '14px' }}>
                  <div
                    style={{
                      width: `${savedPercentage}%`,
                      height: '100%',
                      backgroundColor: '#0f8b8d',
                      borderRadius: '10px',
                      transition: 'width 0.5s ease-in-out'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                  <div style={{ backgroundColor: '#ffffff', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Terkumpul</div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#10b981', marginTop: '2px' }}>
                      {formatRupiah(activePlan.savedAmount)}
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#ffffff', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Target Total</div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                      {formatRupiah(activePlan.targetBudget)}
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#ffffff', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Sisa Dibutuhkan</div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#ef4444', marginTop: '2px' }}>
                      {formatRupiah(remainingBudget)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Motivation Box based on progress tier & target date expiry */}
            {(() => {
              const isExpired = (() => {
                if (!activePlan.targetMonth) return false;
                const t = new Date(activePlan.targetMonth);
                const td = new Date();
                td.setHours(0, 0, 0, 0);
                return t < td;
              })();
              const motivation = getMotivationContent(savedPercentage, isExpired, activePlan.destination);
              return (
                <div style={{ backgroundColor: motivation.bg, borderRadius: '20px', padding: '18px 24px', border: `1px solid ${motivation.border}`, marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ fontSize: '28px' }}>{motivation.icon}</span>
                  <div>
                    <h4 style={{ fontSize: '14.5px', fontWeight: '800', color: motivation.titleColor, margin: '0 0 2px 0' }}>
                      {motivation.title}
                    </h4>
                    <p style={{ fontSize: '12.5px', color: motivation.textColor, margin: 0, fontWeight: '500' }}>
                      {motivation.text}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Grid 2 Columns: Scrollable Checklist & Scrollable History Tabungan */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
              
              {/* Scrollable Checklist Persiapan Liburan with Edit/Hapus for Manual items (Point 3) */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 6px 20px rgba(0,0,0,0.03)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} color="#0f8b8d" /> Checklist Persiapan Trip
                </h3>

                {/* Scrollable Container Box */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px', maxHeight: '340px', overflowY: 'auto', paddingRight: '4px' }}>
                  {activePlan.checklist.map(item => {
                    const completed = isItemCompleted(item);
                    const isAutomated = item.id === '1' || item.id === '2' || item.id === '3' || item.id === '4' || item.id === '5';
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleToggleChecklist(item.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          backgroundColor: completed ? '#f0fdf4' : '#f8fafc',
                          border: `1px solid ${completed ? '#bbf7d0' : '#e2e8f0'}`,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                          {completed ? (
                            <CheckCircle2 size={18} color="#10b981" />
                          ) : (
                            <Circle size={18} color="#94a3b8" />
                          )}
                          <span
                            style={{
                              fontSize: '13px',
                              fontWeight: completed ? '700' : '600',
                              color: completed ? '#166534' : '#334155',
                              textDecoration: completed ? 'line-through' : 'none'
                            }}
                          >
                            {item.label}
                          </span>
                        </div>

                        {/* Automated items show system badge (cannot be deleted/edited) */}
                        {isAutomated ? (
                          <span 
                            title="Item ini diperbarui otomatis oleh sistem"
                            style={{ 
                              fontSize: '10px', 
                              fontWeight: '700', 
                              backgroundColor: '#e0f2fe', 
                              color: '#0284c7', 
                              padding: '2px 8px', 
                              borderRadius: '8px', 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '4px' 
                            }}
                          >
                            <ShieldCheck size={12} /> Otomatis
                          </span>
                        ) : (
                          /* Manual items have Edit & Hapus icons (Point 3) */
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingChecklistId(item.id);
                                setEditingChecklistLabel(item.label);
                              }}
                              title="Edit item"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#0f8b8d' }}
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={(e) => handleDeleteChecklistItem(e, item.id)}
                              title="Hapus item"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#ef4444' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Add Custom Checklist Item Form */}
                <form onSubmit={handleAddChecklistItem} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Tambah item checklist baru..."
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12.5px',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      backgroundColor: '#0f8b8d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '8px 14px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    Tambah
                  </button>
                </form>
              </div>

              {/* Scrollable Riwayat Tabungan Bulanan with Edit & Hapus options (Point 3) */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 6px 20px rgba(0,0,0,0.03)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Wallet size={18} color="#0f8b8d" /> Riwayat Catatan Tabungan
                </h3>

                {activePlan.savingsLogs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px 0', color: '#94a3b8', fontSize: '13px' }}>
                    Belum ada tabungan yang dicatat.<br />Klik tombol <strong>"+ Catat Tabungan Bulan Ini"</strong> di atas.
                  </div>
                ) : (
                  /* Scrollable Container Box for Savings Logs */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '340px', overflowY: 'auto', paddingRight: '4px' }}>
                    {activePlan.savingsLogs.map(log => (
                      <div
                        key={log.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #f1f5f9'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>{log.date}</div>
                          <div style={{ fontSize: '12.5px', color: '#334155', fontWeight: '700' }}>{log.note || 'Tabungan bulanan'}</div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <strong style={{ fontSize: '13.5px', color: '#10b981', fontWeight: '800' }}>
                            + {formatRupiah(log.amount)}
                          </strong>

                          {/* Edit & Hapus options for savings logs (Point 3) */}
                          <button
                            onClick={() => handleOpenSavingsModal(log)}
                            title="Edit Catatan"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#0f8b8d' }}
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={(e) => handleDeleteSavingsLog(e, log.id)}
                            title="Hapus Catatan"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#ef4444' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Rekomendasi Paket Open Trip Sesuaian Destinasi */}
            <div style={{ marginTop: '32px', marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Compass size={20} color="#0f8b8d" /> Rekomendasi Paket Open Trip ke {activePlan.destination}
                </h3>
                <button
                  onClick={() => autoSaveDraftAndNavigate('cari-trip')}
                  style={{ background: 'none', border: 'none', color: '#0f8b8d', fontSize: '13px', fontWeight: '800', cursor: 'pointer' }}
                >
                  Lihat Semua Paket &gt;
                </button>
              </div>

              {loadingPackages ? (
                <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>Memuat rekomendasi paket...</div>
              ) : matchingPackages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '13.5px' }}>
                  Belum ada paket trip spesifik untuk lokasi <strong>{activePlan.destination}</strong>. Silakan cek halaman cari trip untuk pilihan destinasi populer lainnya.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                  {matchingPackages.slice(0, 3).map(pkg => (
                    <div
                      key={pkg.id}
                      onClick={() => autoSaveDraftAndNavigate('paket-detail')}
                      style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                        transition: 'transform 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      <div style={{ height: '140px', width: '100%', position: 'relative' }}>
                        <img src={pkg.image || 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=600'} alt={pkg.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <span style={{ position: 'absolute', top: '8px', left: '8px', backgroundColor: '#0f8b8d', color: 'white', fontSize: '10px', fontWeight: '800', padding: '3px 8px', borderRadius: '6px' }}>
                          {pkg.tripType || 'Open Trip'}
                        </span>
                      </div>
                      <div style={{ padding: '14px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0', lineHeight: 1.3 }}>{pkg.name}</h4>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 10px 0' }}>{pkg.destination}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                          <span style={{ fontSize: '12px', color: '#d97706', fontWeight: '800' }}>⭐ {pkg.rating || '5.0'}</span>
                          <strong style={{ fontSize: '14px', color: '#0f8b8d', fontWeight: '800' }}>{pkg.price}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Action Bar (Points 4 & 5: Interactive Cancel & Permanent Save) */}
            <div 
              style={{ 
                backgroundColor: '#ffffff', 
                borderRadius: '20px', 
                padding: '20px 24px', 
                border: '1px solid #e2e8f0', 
                boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px'
              }}
            >
              <div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                  Selesai Menyusun Rencana Trip?
                </div>
                <div style={{ fontSize: '12.5px', color: '#64748b' }}>
                  Simpan rencana ini agar tersimpan permanen di akunmu dan bisa dipantau kapan saja.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  onClick={handleCancelPlan}
                  style={{
                    padding: '12px 20px',
                    borderRadius: '12px',
                    border: '1.5px solid #ef4444',
                    backgroundColor: '#fef2f2',
                    color: '#ef4444',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Batalkan Rencana Trip
                </button>

                <button
                  onClick={handleSavePlanPermanent}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: '#0f8b8d',
                    color: '#ffffff',
                    fontSize: '13.5px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(15,139,141,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Save size={16} /> Simpan Rencana Trip
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* MODALS */}
        {/* ========================================================================= */}

        {/* Modal Add / Edit Savings Log (Point 3) */}
        {showSavingsModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', maxWidth: '400px', width: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wallet size={20} color="#0f8b8d" /> {editingLogId ? 'Edit Catatan Tabungan' : 'Catat Tabungan Bulan Ini'}
              </h3>
              
              <form onSubmit={handleSaveSavings}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '6px' }}>
                    Nominal Disisihkan (Rp) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 500.000"
                    value={savingsInput}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setSavingsInput(raw ? new Intl.NumberFormat('id-ID').format(parseInt(raw, 10)) : '');
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '14px',
                      fontWeight: '700',
                      color: '#0f8b8d',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    required
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '6px' }}>
                    Catatan Opsional
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Gaji bulan ini, Bonus proyek..."
                    value={savingsNote}
                    onChange={(e) => setSavingsNote(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSavingsModal(false);
                      setEditingLogId(null);
                    }}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '12px',
                      border: 'none',
                      backgroundColor: '#f1f5f9',
                      color: '#64748b',
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '10px 20px',
                      borderRadius: '12px',
                      border: 'none',
                      backgroundColor: '#0f8b8d',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(15,139,141,0.25)'
                    }}
                  >
                    Simpan Tabungan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Edit Manual Checklist Item (Point 3) */}
        {editingChecklistId && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', maxWidth: '400px', width: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit3 size={20} color="#0f8b8d" /> Edit Item Checklist
              </h3>
              
              <form onSubmit={handleSaveEditChecklist}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '6px' }}>
                    Label Item Checklist
                  </label>
                  <input
                    type="text"
                    value={editingChecklistLabel}
                    onChange={(e) => setEditingChecklistLabel(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '13.5px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setEditingChecklistId(null)}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '12px',
                      border: 'none',
                      backgroundColor: '#f1f5f9',
                      color: '#64748b',
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '10px 20px',
                      borderRadius: '12px',
                      border: 'none',
                      backgroundColor: '#0f8b8d',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: '800',
                      cursor: 'pointer'
                    }}
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Info Item Otomatis System */}
        {autoItemModalInfo && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', maxWidth: '420px', width: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
              <h3 style={{ fontSize: '16.5px', fontWeight: '800', color: '#0f172a', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Info size={20} color="#0284c7" /> Informasi Item Sistem Otomatis
              </h3>
              <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: '0 0 20px 0' }}>
                {autoItemModalInfo}
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setAutoItemModalInfo(null)}
                  style={{
                    backgroundColor: '#0f8b8d',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 20px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Mengerti
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
