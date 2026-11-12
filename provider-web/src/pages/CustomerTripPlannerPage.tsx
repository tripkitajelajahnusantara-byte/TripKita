import React, { useState, useEffect, useRef } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { request } from '../utils/api';
import { filterCustomerVisiblePackages, isPackageExpired } from '../utils/publicPackages';
import { useActionLock } from '../utils/useActionLock';
import { getTripImage } from '../utils/tripImages';
import { TripImage } from '../components/TripImage';
import { SkeletonCards } from '../components/Skeleton';
import { useI18n } from '../i18n';
import type { TripPlan, TripChecklistItem, TripSavingsLog, PackageItem } from '../types';
import { 
  Target, Calendar, Users, Wallet, CheckCircle2, Circle, Compass, ListChecks, CalendarClock, Star, 
  Trash2, Save, Info, Plus, ArrowLeft, HeartHandshake, ShieldCheck, Edit3, LoaderCircle
} from 'lucide-react';

const getTodayIsoDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDefaultTargetDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const getMaximumTargetDate = () => {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 5);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const formatDateIndo = (dateStr: string, locale = 'id-ID') => {
  if (!dateStr) return 'Pilih tanggal trip';
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = year && month && day ? new Date(year, month - 1, day) : new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
};

// Label checklist bawaan disimpan dalam bahasa Indonesia; hanya tampilannya yang diterjemahkan.
const DEFAULT_CHECKLIST_EN: Record<string, string> = {
  'Tentukan Destinasi & Target Budget Liburan': 'Set Destination & Trip Budget',
  'Capai 25% Tabungan Perjalanan': 'Reach 25% of Trip Savings',
  'Capai 50% Tabungan Perjalanan': 'Reach 50% of Trip Savings',
  'Capai 75% Tabungan Perjalanan': 'Reach 75% of Trip Savings',
  'Capai 100% Target Tabungan': 'Reach 100% of Savings Goal',
  'Cari & Pesan Paket Open Trip di TemenTrip': 'Find & Book an Open Trip on TemenTrip',
  'Siapkan Barang Bawaan & Pakaian Liburan': 'Pack Your Bags & Travel Clothes',
  'Berangkat sesuai jadwal': 'Depart as scheduled',
};

const normalizeTripPlan = (raw: any): TripPlan => {
  const savingsLogs: TripSavingsLog[] = Array.isArray(raw?.savingsLogs)
    ? raw.savingsLogs.map((log: any) => ({
        id: String(log.id),
        date: /^\d{4}-\d{2}-\d{2}$/.test(String(log.date || '')) ? String(log.date) : getTodayIsoDate(),
        amount: Number(log.amount) || 0,
        note: String(log.note || ''),
      }))
    : [];
  return {
    id: String(raw.id),
    destination: String(raw.destination || ''),
    targetMonth: String(raw.targetMonth || ''),
    targetMonthLabel: String(raw.targetMonthLabel || formatDateIndo(String(raw.targetMonth || ''))),
    participants: Number(raw.participants) || 1,
    targetBudget: Number(raw.targetBudget) || 0,
    savedAmount: savingsLogs.reduce((sum, log) => sum + log.amount, 0),
    checklist: Array.isArray(raw.checklist)
      ? raw.checklist.map((item: any) => ({ id: String(item.id), label: String(item.label || ''), completed: item.completed === true }))
      : [],
    savingsLogs,
    status: raw.status === 'DRAFT' ? 'DRAFT' : 'SAVED',
    createdAt: String(raw.createdAt || new Date().toISOString()),
    updatedAt: String(raw.updatedAt || new Date().toISOString()),
  };
};

const formatRupiah = (val: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
};

const getMotivationContent = (pct: number, isExpired: boolean, dest: string, t: (id: string, en: string) => string) => {
  const pctLabel = Math.min(100, Math.max(0, Math.floor(pct)));

  if (isExpired && pct < 100) {
    return {
      icon: CalendarClock,
      title: t('Tanggal keberangkatan sudah lewat', 'Departure date has passed'),
      text: t(`Tabungan untuk ${dest} baru ${pctLabel}% dari target. Ubah tanggal keberangkatan jika rencana ini masih berjalan.`, `Savings for ${dest} are only at ${pctLabel}% of the goal. Change the departure date if this plan is still on.`),
      bg: '#fffbe6',
      border: '#ffe58f',
      titleColor: '#d48806',
      textColor: '#784c00'
    };
  }

  if (pct >= 100) {
    return {
      icon: CheckCircle2,
      title: t('Target tabungan tercapai', 'Savings goal reached'),
      text: t(`Tabungan untuk ${dest} sudah 100% dari target. Anda bisa mulai memilih paket trip.`, `Savings for ${dest} are at 100% of the goal. You can start choosing a trip.`),
      bg: '#dcfce7',
      border: '#86efac',
      titleColor: '#15803d',
      textColor: '#166534'
    };
  }

  if (pct >= 75) {
    return {
      icon: Wallet,
      title: t(`Tabungan mencapai ${pctLabel}% dari target`, `Savings at ${pctLabel}% of goal`),
      text: t(`Sisa kurang dari 25% lagi untuk trip ke ${dest}.`, `Less than 25% to go for your trip to ${dest}.`),
      bg: '#ecfdf5',
      border: '#a7f3d0',
      titleColor: '#047857',
      textColor: '#065f46'
    };
  }

  if (pct >= 50) {
    return {
      icon: Wallet,
      title: t(`Tabungan mencapai ${pctLabel}% dari target`, `Savings at ${pctLabel}% of goal`),
      text: t(`Lebih dari setengah dana untuk trip ke ${dest} sudah terkumpul.`, `You've saved more than half the funds for your trip to ${dest}.`),
      bg: '#e0e7ff',
      border: '#c7d2fe',
      titleColor: '#4338ca',
      textColor: '#3730a3'
    };
  }

  if (pct >= 25) {
    return {
      icon: Wallet,
      title: t(`Tabungan mencapai ${pctLabel}% dari target`, `Savings at ${pctLabel}% of goal`),
      text: t(`Catat setoran berikutnya agar progres trip ke ${dest} tetap terpantau.`, `Log your next deposit to keep tracking your trip to ${dest}.`),
      bg: '#e0f2fe',
      border: '#bae6fd',
      titleColor: '#0284c7',
      textColor: '#0369a1'
    };
  }

  // 0% - 24% Progress
  return {
    icon: Wallet,
    title: pctLabel > 0 ? t(`Tabungan mencapai ${pctLabel}% dari target`, `Savings at ${pctLabel}% of goal`) : t('Belum ada tabungan tercatat', 'No savings logged yet'),
    text: t(`Tambahkan setoran untuk mulai melacak progres trip ke ${dest}.`, `Add a deposit to start tracking your trip to ${dest}.`),
    bg: '#e6f4f4',
    border: '#b2e0e0',
    titleColor: '#0f8b8d',
    textColor: '#134e4a'
  };
};

// Rekomendasi paket hanya berasal dari paket aktif di backend; tidak ada
// katalog contoh yang tidak dapat dipesan.

export const CustomerTripPlannerPage: React.FC = () => {
  const { customerProfile, navigateTo, setSelectedPackageForDetail } = useNavigation();
  const { t, lang, locale } = useI18n();
  const checklistLabel = (label: string) => (lang === 'en' ? DEFAULT_CHECKLIST_EN[label] ?? label : label);
  // Label tanggal tersimpan berbahasa Indonesia; versi Inggris diformat ulang dari tanggalnya.
  const planDateLabel = (plan: TripPlan) => (lang === 'en' && plan.targetMonth ? formatDateIndo(plan.targetMonth, locale) : plan.targetMonthLabel);

  // Local storage is retained only as a one-time migration/cache. The backend
  // is the source of truth so web and mobile always show the same plans.
  const storageKey = customerProfile ? `tementrip_plans_cust_${customerProfile.id}` : '';

  // Account Plans Array (Max 10 plans)
  const [plans, setPlans] = useState<TripPlan[]>([]);
  const [activePlan, setActivePlan] = useState<TripPlan | null>(null);
  
  // Page view modes: 'LIST' (home list), 'FORM' (create/edit form), 'DETAIL' (full detail dashboard)
  const [viewState, setViewState] = useState<'LIST' | 'FORM' | 'DETAIL'>('LIST');
  const [isEditingExisting, setIsEditingExisting] = useState(false);

  // Form input state
  const [destination, setDestination] = useState('');
  const [targetDate, setTargetDate] = useState(getDefaultTargetDate());
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
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [plannerError, setPlannerError] = useState('');

  // Satu kunci aksi untuk seluruh halaman: setiap perubahan mengirim PUT
  // rencana utuh, jadi dua aksi paralel bisa saling menimpa. Dengan kunci ini
  // aksi berikutnya baru jalan setelah state hasil aksi sebelumnya dirender.
  const { pending, isBusy, run } = useActionLock();

  // Penyimpanan per rencana yang sedang berjalan. Rencana baru masih ber-id
  // lokal `plan_*` sehingga disimpan lewat POST; tanpa antrean ini dua
  // panggilan berdekatan akan membuat dua rencana ganda di server.
  const inFlightSavesRef = useRef(new Map<string, Promise<TripPlan>>());
  // Setelah POST berhasil, id lokal dipetakan ke id server agar panggilan yang
  // masih memegang objek lama (closure basi) melakukan PUT, bukan POST lagi.
  const serverIdByLocalIdRef = useRef(new Map<string, string>());

  // Helper for customer identity
  // Load server plans and migrate an older device-only list once.
  useEffect(() => {
    let cancelled = false;
    if (!customerProfile || !storageKey) {
      setLoadingPlans(false);
      return;
    }
    setLoadingPlans(true);
    setPlannerError('');
    request('/customer/trip-plans')
      .then(async (data: any) => {
        // Effect yang sudah dibatalkan (unmount / StrictMode) tidak boleh ikut
        // migrasi, karena effect penggantinya akan melakukannya sendiri.
        if (cancelled) return;
        const remote = (Array.isArray(data) ? data : []).map(normalizeTripPlan);
        const saved = localStorage.getItem(storageKey);
        if (remote.length === 0 && saved) {
          // Kunci dihapus sebelum POST pertama (sinkron dengan getItem di atas)
          // sehingga effect lain yang berjalan bersamaan tidak memigrasikan
          // data yang sama untuk kedua kalinya.
          localStorage.removeItem(storageKey);
          let pendingLegacy: any[] = [];
          try {
            const legacy = JSON.parse(saved);
            if (Array.isArray(legacy)) {
              // Id numerik berarti data itu sudah berasal dari server; hanya
              // rencana lokal lama yang perlu dibuat ulang.
              pendingLegacy = legacy.slice(0, 10).filter((item) => !/^\d+$/.test(String(item?.id ?? '')));
              while (pendingLegacy.length > 0) {
                const item = pendingLegacy[0];
                const normalized = normalizeTripPlan(item);
                const created = await request('/customer/trip-plans', {
                  method: 'POST',
                  body: JSON.stringify({
                    destination: normalized.destination,
                    targetMonth: normalized.targetMonth >= getTodayIsoDate() && normalized.targetMonth <= getMaximumTargetDate()
                      ? normalized.targetMonth
                      : getDefaultTargetDate(),
                    participants: Math.min(100, Math.max(1, normalized.participants)),
                    targetBudget: normalized.targetBudget,
                    checklist: normalized.checklist,
                    savingsLogs: normalized.savingsLogs,
                    status: normalized.status,
                  }),
                });
                remote.push(normalizeTripPlan(created));
                pendingLegacy = pendingLegacy.slice(1);
              }
            }
          } catch (error) {
            console.error('Gagal memigrasikan rencana trip lokal', error);
            // Sisa rencana yang belum terkirim dikembalikan agar bisa dicoba
            // lagi pada kunjungan berikutnya tanpa menduplikasi yang sudah masuk.
            if (pendingLegacy.length > 0) {
              localStorage.setItem(storageKey, JSON.stringify(pendingLegacy));
            }
          }
        }
        if (cancelled) return;
        setPlans(remote);
        setViewState(remote.length > 0 ? 'LIST' : 'FORM');
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Gagal memuat rencana trip', error);
        setPlannerError(error instanceof Error ? error.message : t('Rencana trip belum dapat dimuat.', 'Could not load your trip plans.'));
        setPlans([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingPlans(false);
      });
    return () => { cancelled = true; };
  }, [customerProfile?.id, storageKey]);

  // Daftar rencana tidak lagi ditulis ke localStorage: kunci yang sama dibaca
  // sebagai sumber migrasi, sehingga cache lama bisa "menghidupkan" kembali
  // rencana yang sudah dihapus di perangkat lain dan membuatnya ganda.
  const cachePlans = (updatedPlans: TripPlan[]) => {
    setPlans(updatedPlans);
  };

  const persistPlan = (plan: TripPlan): Promise<TripPlan> => {
    const key = serverIdByLocalIdRef.current.get(plan.id) ?? plan.id;
    // Penyimpanan untuk rencana yang sama diantrikan: panggilan kedua menunggu
    // yang pertama selesai lalu memakai id server hasil POST tersebut.
    const previous = inFlightSavesRef.current.get(key);
    const next = (previous ? previous.catch(() => undefined) : Promise.resolve(undefined))
      .then(() => sendPlan({ ...plan, id: serverIdByLocalIdRef.current.get(plan.id) ?? plan.id }));
    inFlightSavesRef.current.set(key, next);
    const cleanup = () => {
      if (inFlightSavesRef.current.get(key) === next) inFlightSavesRef.current.delete(key);
    };
    next.then(cleanup, cleanup);
    return next;
  };

  const sendPlan = async (plan: TripPlan): Promise<TripPlan> => {
    const isServerPlan = /^\d+$/.test(plan.id);
    const saved = normalizeTripPlan(await request(
      isServerPlan ? `/customer/trip-plans/${plan.id}` : '/customer/trip-plans',
      {
        method: isServerPlan ? 'PUT' : 'POST',
        body: JSON.stringify({
          destination: plan.destination,
          targetMonth: plan.targetMonth,
          participants: plan.participants,
          targetBudget: plan.targetBudget,
          checklist: plan.checklist,
          savingsLogs: plan.savingsLogs,
          status: plan.status || 'SAVED',
        }),
      },
    ));
    if (!isServerPlan) serverIdByLocalIdRef.current.set(plan.id, saved.id);
    // Updater fungsional agar hasil dua penyimpanan berurutan tidak saling
    // menimpa daftar dari closure yang sudah basi.
    setPlans((current) => {
      const withoutOldVersion = current.filter((item) => item.id !== plan.id && item.id !== saved.id);
      return [saved, ...withoutOldVersion].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    });
    setActivePlan(saved);
    return saved;
  };

  const persistPlanChange = async (plan: TripPlan): Promise<boolean> => {
    if (!/^\d+$/.test(plan.id)) {
      setActivePlan(plan);
      return true;
    }
    try {
      await persistPlan(plan);
      return true;
    } catch (error) {
      alert(error instanceof Error ? error.message : t('Perubahan rencana trip gagal disimpan.', 'Could not save changes to your trip plan.'));
      return false;
    }
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
          // Rekomendasi hanya paket yang masih bisa dipesan.
          const active = filterCustomerVisiblePackages(apiList).filter((pkg) => !isPackageExpired(pkg));
          setMatchingPackages(filterMatchingPackages(active, activePlan.destination));
        })
        .catch(err => {
          console.error('Error fetching packages:', err);
          setMatchingPackages([]);
        })
        .finally(() => setLoadingPackages(false));
    }
  }, [activePlan?.destination, viewState]);

  // Start creating a new plan from Home List
  const handleStartNewPlan = () => {
    if (plans.length >= 10) {
      alert(t('Batas maksimal 10 rencana trip telah tercapai. Silakan hapus rencana lama terlebih dahulu jika ingin membuat rencana baru.', 'You can have up to 10 trip plans. Delete an old plan before creating a new one.'));
      return;
    }
    setDestination('');
    setTargetDate(getDefaultTargetDate());
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
    setTargetDate(planToEdit.targetMonth || getDefaultTargetDate());
    setParticipants(planToEdit.participants);
    setTargetBudget(planToEdit.targetBudget.toString());
    setIsEditingExisting(true);
    setViewState('FORM');
  };

  // Step 1 Form Handler: Proceed to Detail View
  const handleProceedToDetail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim()) {
      alert(t('Silakan isi destinasi impian Anda.', 'Please enter your dream destination.'));
      return;
    }
    if (targetDate < getTodayIsoDate() || targetDate > getMaximumTargetDate()) {
      alert(t('Tanggal keberangkatan harus antara hari ini dan maksimal 5 tahun ke depan.', 'Departure date must be between today and 5 years from now.'));
      return;
    }
    if (!Number.isInteger(participants) || participants < 1 || participants > 100) {
      alert(t('Jumlah peserta harus antara 1 dan 100 orang.', 'Number of travelers must be between 1 and 100.'));
      return;
    }
    const numBudget = parseInt(targetBudget.replace(/\D/g, ''), 10);
    if (isNaN(numBudget) || numBudget <= 0) {
      alert(t('Silakan masukkan target budget yang valid.', 'Please enter a valid budget goal.'));
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
      { id: '8', label: 'Berangkat sesuai jadwal', completed: false },
    ];

    if (isEditingExisting && activePlan) {
      const updated: TripPlan = {
        ...activePlan,
        destination: destination.trim(),
        targetMonth: targetDate,
        targetMonthLabel: formattedDateLabel,
        participants: Number(participants) || 1,
        targetBudget: numBudget,
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setActivePlan(newPlanObj);
    }

    setViewState('DETAIL');
  };

  // Permanently Save Active Plan (Step 2 Bottom Action)
  const handleSavePlanPermanent = async () => {
    if (isBusy || !activePlan) return;
    const finalPlan: TripPlan = {
      ...activePlan,
      status: 'SAVED',
      updatedAt: new Date().toISOString()
    };
    await run('save-plan', async () => {
      try {
        const saved = await persistPlan(finalPlan);
        alert(t(`Rencana trip ke "${saved.destination}" berhasil disimpan. Email dan notifikasi konfirmasi telah diproses.`, `Your trip plan to "${saved.destination}" has been saved. A confirmation email and notification are on their way.`));
        setViewState('LIST');
      } catch (error) {
        alert(error instanceof Error ? error.message : t('Rencana trip gagal disimpan.', 'Could not save your trip plan.'));
      }
    });
  };

  // Batalkan Rencana Trip (Point 4: Confirms and deletes/cancels plan)
  const handleCancelPlan = async () => {
    // Dicek sebelum confirm agar dialog tidak muncul saat penyimpanan lain
    // masih berjalan (hasilnya bisa membuat ulang rencana yang dihapus).
    if (isBusy) return;
    if (!activePlan) {
      if (plans.length > 0) setViewState('LIST');
      else handleStartNewPlan();
      return;
    }

    if (!window.confirm(t(`Apakah Anda yakin ingin membatalkan rencana trip ke "${activePlan.destination}"? Tindakan ini akan menghapus semua data yang sudah diisi.`, `Cancel your trip plan to "${activePlan.destination}"? This will delete everything you've entered.`))) {
      return;
    }
    const planToCancel = activePlan;
    await run('cancel-plan', async () => {
      try {
        if (/^\d+$/.test(planToCancel.id)) {
          await request(`/customer/trip-plans/${planToCancel.id}`, { method: 'DELETE' });
        }
      } catch (error) {
        alert(error instanceof Error ? error.message : t('Rencana trip gagal dihapus.', 'Could not delete your trip plan.'));
        return;
      }
      const filtered = plans.filter(p => p.id !== planToCancel.id);
      cachePlans(filtered);

      setActivePlan(null);
      setDestination('');
      setTargetDate(getDefaultTargetDate());
      setParticipants(2);
      setTargetBudget('');

      if (filtered.length > 0) {
        setViewState('LIST');
      } else {
        handleStartNewPlan();
      }
    });
  };

  // Delete Plan from List
  const handleDeletePlanFromList = async (e: React.MouseEvent, planId: string, destName: string) => {
    e.stopPropagation();
    if (isBusy) return;
    if (!window.confirm(t(`Apakah Anda yakin ingin menghapus rencana trip ke "${destName}"?`, `Delete your trip plan to "${destName}"?`))) {
      return;
    }

    await run(`delete-plan-${planId}`, async () => {
      try {
        if (/^\d+$/.test(planId)) await request(`/customer/trip-plans/${planId}`, { method: 'DELETE' });
      } catch (error) {
        alert(error instanceof Error ? error.message : t('Rencana trip gagal dihapus.', 'Could not delete your trip plan.'));
        return;
      }
      const filtered = plans.filter(p => p.id !== planId);
      cachePlans(filtered);

      if (activePlan?.id === planId) {
        setActivePlan(null);
      }

      if (filtered.length === 0) {
        handleStartNewPlan();
      }
    });
  };

  // Save active plan as DRAFT automatically when navigating to packages
  const autoSaveDraftAndNavigate = async (targetRoute: 'cari-trip' | 'paket-detail') => {
    if (isBusy) return;
    await run('navigate', async () => {
      if (activePlan) {
        const draftPlan: TripPlan = {
          ...activePlan,
          status: activePlan.status || 'DRAFT',
          updatedAt: new Date().toISOString()
        };
        try {
          await persistPlan(draftPlan);
        } catch (error) {
          alert(error instanceof Error ? error.message : t('Draft rencana trip gagal disimpan.', 'Could not save your trip plan draft.'));
          return;
        }
      }
      navigateTo(targetRoute);
    });
  };

  const handleBackToPlanList = async () => {
    if (isBusy) return;
    if (!activePlan) {
      setViewState('LIST');
      return;
    }
    const planToSave = activePlan;
    await run('back-to-list', async () => {
      try {
        await persistPlan({
          ...planToSave,
          status: /^\d+$/.test(planToSave.id) ? (planToSave.status || 'SAVED') : 'DRAFT',
          updatedAt: new Date().toISOString(),
        });
        setViewState('LIST');
      } catch (error) {
        alert(error instanceof Error ? error.message : t('Draft rencana trip gagal disimpan.', 'Could not save your trip plan draft.'));
      }
    });
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

  const handleSaveSavings = async (e: React.FormEvent) => {
    e.preventDefault();
    // Setiap perubahan mengirim PUT rencana utuh; submit kedua saat yang pertama
    // belum selesai akan menimpa hasilnya atau mencatat tabungan dua kali.
    if (isBusy || !activePlan) return;
    const amount = parseInt(savingsInput.replace(/\D/g, ''), 10);
    if (isNaN(amount) || amount <= 0) {
      alert(t('Masukkan nominal tabungan yang valid.', 'Please enter a valid savings amount.'));
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
        date: getTodayIsoDate(),
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

    await run('save-savings', async () => {
      if (!(await persistPlanChange(updatedPlan))) return;

      setShowSavingsModal(false);
      setSavingsInput('');
      setSavingsNote('');
      setEditingLogId(null);
    });
  };

  // Delete Savings Log (Point 3)
  const handleDeleteSavingsLog = async (e: React.MouseEvent, logId: string) => {
    e.stopPropagation();
    if (isBusy || !activePlan) return;
    if (!window.confirm(t('Apakah Anda yakin ingin menghapus catatan tabungan ini?', 'Delete this savings entry?'))) return;

    const updatedLogs = activePlan.savingsLogs.filter(l => l.id !== logId);
    const newSavedTotal = updatedLogs.reduce((acc, curr) => acc + curr.amount, 0);

    const updatedPlan: TripPlan = {
      ...activePlan,
      savedAmount: newSavedTotal,
      savingsLogs: updatedLogs,
      updatedAt: new Date().toISOString()
    };

    await run(`delete-log-${logId}`, () => persistPlanChange(updatedPlan));
  };

  // Toggle Manual Checklist Item (1,2,3,4,5 show automated info modal)
  const handleToggleChecklist = async (id: string) => {
    if (!activePlan) return;

    if (id === '1') {
      setAutoItemModalInfo(t('Item "Tentukan Destinasi & Target Budget Liburan" otomatis tercentang ketika rencana trip impian berhasil dibuat.', '"Set Destination & Trip Budget" is checked automatically once your trip plan is created.'));
      return;
    }
    if (id === '2') {
      setAutoItemModalInfo(t('Item "Capai 25% Tabungan Perjalanan" otomatis tercentang oleh sistem ketika total tabungan terkumpul sudah mencapai 25% dari target budget.', '"Reach 25% of Trip Savings" is checked automatically once your total savings reach 25% of your budget goal.'));
      return;
    }
    if (id === '3') {
      setAutoItemModalInfo(t('Item "Capai 50% Tabungan Perjalanan" otomatis tercentang oleh sistem ketika total tabungan terkumpul sudah mencapai 50% dari target budget.', '"Reach 50% of Trip Savings" is checked automatically once your total savings reach 50% of your budget goal.'));
      return;
    }
    if (id === '4') {
      setAutoItemModalInfo(t('Item "Capai 75% Tabungan Perjalanan" otomatis tercentang oleh sistem ketika total tabungan terkumpul sudah mencapai 75% dari target budget.', '"Reach 75% of Trip Savings" is checked automatically once your total savings reach 75% of your budget goal.'));
      return;
    }
    if (id === '5') {
      setAutoItemModalInfo(t('Item "Capai 100% Target Tabungan" otomatis tercentang oleh sistem ketika total tabungan terkumpul sudah mencapai 100% dari target budget.', '"Reach 100% of Savings Goal" is checked automatically once your total savings reach 100% of your budget goal.'));
      return;
    }

    // Info item otomatis di atas tetap boleh dibuka; hanya perubahan data yang
    // menunggu aksi sebelumnya selesai.
    if (isBusy) return;
    const updatedChecklist = activePlan.checklist.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    const updatedPlan: TripPlan = { ...activePlan, checklist: updatedChecklist };
    await run(`toggle-checklist-${id}`, () => persistPlanChange(updatedPlan));
  };

  // Add Custom Checklist Item
  const handleAddChecklistItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy || !activePlan || !newChecklistItem.trim()) return;
    const newItem: TripChecklistItem = {
      id: `chk_${Date.now()}`,
      label: newChecklistItem.trim(),
      completed: false
    };
    const updatedPlan: TripPlan = {
      ...activePlan,
      checklist: [...activePlan.checklist, newItem]
    };
    await run('add-checklist', async () => {
      if (await persistPlanChange(updatedPlan)) setNewChecklistItem('');
    });
  };

  // Edit Manual Checklist Item (Point 3)
  const handleSaveEditChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy || !activePlan || !editingChecklistId || !editingChecklistLabel.trim()) return;

    const updatedChecklist = activePlan.checklist.map(item =>
      item.id === editingChecklistId ? { ...item, label: editingChecklistLabel.trim() } : item
    );
    const updatedPlan: TripPlan = { ...activePlan, checklist: updatedChecklist };
    await run('edit-checklist', async () => {
      if (await persistPlanChange(updatedPlan)) {
        setEditingChecklistId(null);
        setEditingChecklistLabel('');
      }
    });
  };

  // Delete Manual Checklist Item (Point 3)
  const handleDeleteChecklistItem = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    if (isBusy || !activePlan) return;
    if (!window.confirm(t('Apakah Anda yakin ingin menghapus item checklist ini?', 'Delete this checklist item?'))) return;

    const updatedChecklist = activePlan.checklist.filter(item => item.id !== itemId);
    const updatedPlan: TripPlan = { ...activePlan, checklist: updatedChecklist };
    await run(`delete-checklist-${itemId}`, () => persistPlanChange(updatedPlan));
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
            <Target size={28} color="#0f8b8d" /> {t('Rencana Trip & Target Tabungan', 'Trip Plans & Savings Goals')}
          </h1>
          <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0 }}>
            {t('Susun liburan impianmu bersama pasangan atau teman, atur target tabungan bulanan, dan wujudkan trip impian tanpa beban.', 'Plan your dream trip with your partner or friends, set a monthly savings goal, and get there without the stress.')}
          </p>
        </div>

        {loadingPlans && (
          <SkeletonCards count={3} minWidth={290} label={t('Memuat rencana trip', 'Loading trip plans')} />
        )}
        {!loadingPlans && plannerError && (
          <div style={{ padding: '18px', marginBottom: '20px', borderRadius: '14px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' }}>
            {plannerError} {t('Muat ulang halaman untuk mencoba kembali.', 'Reload the page to try again.')}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 1: HOME LIST PAGE (Tampilan Awal Daftar Rencana Trip Saya) */}
        {/* ========================================================================= */}
        {!loadingPlans && !plannerError && viewState === 'LIST' && (
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
                  <HeartHandshake size={14} /> {t('Perencana tabungan trip', 'Trip savings planner')}
                </span>
                
                <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#ffffff', margin: '14px 0 8px 0', lineHeight: 1.3, textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                  {t('Rencanakan trip bersama pasangan, teman, atau keluarga', 'Plan a trip with your partner, friends, or family')}
                </h2>
                
                <p style={{ fontSize: '14px', color: '#f0f9ff', margin: 0, lineHeight: 1.6, fontWeight: '500', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                  {t('Tentukan destinasi, target budget, dan tanggal berangkat. Catat setiap setoran tabungan untuk melihat progresnya.', 'Set a destination, budget goal, and departure date. Log each savings deposit to see your progress.')}
                </p>
              </div>
            </div>

            {/* List of Saved/Draft Plans Section (Points 1 & 6) */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '28px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', marginBottom: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Compass size={20} color="#0f8b8d" /> {t('Daftar Rencana Trip Saya', 'My Trip Plans')} ({plans.length}/10)
                </h2>
              </div>

              {plans.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
                  {t('Belum ada rencana trip yang dibuat.', "You haven't created any trip plans yet.")}<br />
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
                    + {t('Buat Rencana Trip Baru', 'Create New Trip Plan')}
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
                                {p.status === 'SAVED' ? t('Tersimpan', 'Saved') : 'Draft'}
                              </span>
                              <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f8b8d', backgroundColor: '#e6f4f4', padding: '3px 10px', borderRadius: '12px' }}>
                                {pct}% {t('Terkumpul', 'Funded')}
                              </span>
                            </div>

                            <h3 style={{ fontSize: '19px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0' }}>
                              {p.destination}
                            </h3>

                            <div style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '14px', display: 'flex', gap: '16px', fontWeight: '600' }}>
                              <span><Calendar size={13} style={{ display: 'inline', verticalAlign: '-2px', color: '#0f8b8d' }} /> {planDateLabel(p)}</span>
                              <span><Users size={13} style={{ display: 'inline', verticalAlign: '-2px', color: '#0f8b8d' }} /> {p.participants} {t('Peserta', p.participants === 1 ? 'Traveler' : 'Travelers')}</span>
                            </div>

                            {/* Financial Stats Summary Box */}
                            <div style={{ backgroundColor: '#f8fafc', borderRadius: '14px', padding: '12px', border: '1px solid #f1f5f9', marginBottom: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              <div>
                                <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>{t('Terkumpul', 'Collected')}</div>
                                <div style={{ fontSize: '13px', fontWeight: '800', color: '#10b981', marginTop: '2px' }}>{formatRupiah(p.savedAmount)}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>{t('Target Budget', 'Budget Goal')}</div>
                                <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{formatRupiah(p.targetBudget)}</div>
                              </div>
                              <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #e2e8f0', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>{t('Sisa Dibutuhkan:', 'Still Needed:')}</span>
                                <strong style={{ fontSize: '12px', color: remaining > 0 ? '#ef4444' : '#10b981', fontWeight: '800' }}>
                                  {remaining > 0 ? formatRupiah(remaining) : t('Lunas', 'Fully funded')}
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
                              {t('Lihat Detail', 'View Details')} &rarr;
                            </button>

                            {/* Edit Icon (Pencil) & Hapus Icon */}
                            <button
                              onClick={() => handleStartEditPlan(p)}
                              title={t('Edit Rencana', 'Edit Plan')}
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
                              title={t('Hapus Rencana', 'Delete Plan')}
                              disabled={isBusy}
                              aria-busy={pending === `delete-plan-${p.id}`}
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
                              {pending === `delete-plan-${p.id}` ? <LoaderCircle size={15} className="btn-spinner" aria-hidden="true" /> : <Trash2 size={15} color="#ef4444" />}
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
                        <Plus size={16} /> + {t('Buat Rencana Baru', 'New Plan')} ({plans.length}/10)
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
        {!loadingPlans && !plannerError && viewState === 'FORM' && (
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
                  <HeartHandshake size={14} /> {t('Perencana tabungan trip', 'Trip savings planner')}
                </span>
                
                <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#ffffff', margin: '14px 0 8px 0', lineHeight: 1.3, textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                  {t('Rencanakan trip bersama pasangan, teman, atau keluarga', 'Plan a trip with your partner, friends, or family')}
                </h2>
                
                <p style={{ fontSize: '14px', color: '#f0f9ff', margin: 0, lineHeight: 1.6, fontWeight: '500', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                  {t('Tentukan destinasi, target budget, dan tanggal berangkat. Catat setiap setoran tabungan untuk melihat progresnya.', 'Set a destination, budget goal, and departure date. Log each savings deposit to see your progress.')}
                </p>
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '28px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Compass size={20} color="#0f8b8d" /> {isEditingExisting ? t('Edit Rencana Trip', 'Edit Trip Plan') : t('Buat Rencana Trip Impian Baru', 'Create a New Dream Trip Plan')}
              </h2>

              <form onSubmit={handleProceedToDetail} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
                
                {/* Destinasi */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
                    {t('Destinasi Impian', 'Dream Destination')} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder={t('Contoh: Palu, Raja Ampat, Bali, Bandung...', 'e.g. Palu, Raja Ampat, Bali, Bandung...')}
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
                    {t('Rencana Waktu Keberangkatan', 'Planned Departure Date')} <span style={{ color: '#ef4444' }}>*</span>
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
                      <span>{targetDate ? formatDateIndo(targetDate, locale) : t('Pilih tanggal trip', 'Choose a trip date')}</span>
                      <Calendar size={18} color="#0f8b8d" />
                    </div>
                    <input 
                      ref={dateInputRef}
                      type="date" 
                      min={getTodayIsoDate()}
                      max={getMaximumTargetDate()}
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
                    {t('Tanggal sebelum hari ini di-lock secara otomatis.', 'Past dates are locked.')}
                  </span>
                </div>

                {/* Jumlah Peserta */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
                    {t('Jumlah Peserta (Orang)', 'Number of Travelers')} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
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
                    {t('Total Target Budget (Rp)', 'Total Budget Goal (Rp)')} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder={t('Contoh: 5.000.000', 'e.g. 5.000.000')}
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
                    {t('Batal', 'Cancel')}
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
                    {t('Lanjut ke Detail & Rencana Trip', 'Continue to Plan Details')} &rarr;
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: DETAIL PAGE (Point 5: CLEAN DETAIL DASHBOARD WITHOUT HEADER BUTTONS) */}
        {/* ========================================================================= */}
        {!loadingPlans && !plannerError && viewState === 'DETAIL' && activePlan && (
          <div>
            {/* Navigation Back Link to Home List */}
            <div style={{ marginBottom: '16px' }}>
              <button
                onClick={handleBackToPlanList}
                disabled={isBusy}
                aria-busy={pending === 'back-to-list'}
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
                {pending === 'back-to-list'
                  ? <><LoaderCircle size={14} className="btn-spinner" aria-hidden="true" /> {t('Menyimpan...', 'Saving...')}</>
                  : <><ArrowLeft size={16} /> &larr; {t('Kembali ke Daftar Rencana Trip Saya', 'Back to My Trip Plans')}</>}
              </button>
            </div>

            {/* Top Overview Cards */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.04)', marginBottom: '24px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ backgroundColor: '#e6f4f4', color: '#0f8b8d', fontSize: '11px', fontWeight: '800', padding: '4px 10px', borderRadius: '20px', textTransform: 'uppercase' }}>
                      {t('Target Liburan', 'Trip Goal')}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: '800', padding: '4px 10px', borderRadius: '20px', backgroundColor: activePlan.status === 'SAVED' ? '#dcfce7' : '#fef3c7', color: activePlan.status === 'SAVED' ? '#166534' : '#92400e' }}>
                      Status: {activePlan.status === 'SAVED' ? t('Tersimpan', 'Saved') : t('Draft (Belum Disimpan)', 'Draft (Not Saved)')}
                    </span>
                  </div>
                  <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '8px 0 2px 0' }}>
                    {activePlan.destination}
                  </h2>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12.5px', color: '#64748b', fontWeight: '600' }}>
                    <span><Calendar size={14} style={{ display: 'inline', verticalAlign: '-2px', color: '#0f8b8d' }} /> {planDateLabel(activePlan)}</span>
                    <span><Users size={14} style={{ display: 'inline', verticalAlign: '-2px', color: '#0f8b8d' }} /> {activePlan.participants} {t('Peserta', activePlan.participants === 1 ? 'Traveler' : 'Travelers')}</span>
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
                  <Wallet size={16} /> + {t('Catat Tabungan Bulan Ini', 'Log Savings')}
                </button>
              </div>

              {/* Savings Progress Bar */}
              <div style={{ backgroundColor: '#f8fafc', borderRadius: '16px', padding: '18px', border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '800', color: '#334155', marginBottom: '8px' }}>
                  <span>{t('Progres tabungan', 'Savings progress')}</span>
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
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>{t('Terkumpul', 'Collected')}</div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#10b981', marginTop: '2px' }}>
                      {formatRupiah(activePlan.savedAmount)}
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#ffffff', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>{t('Target Total', 'Total Goal')}</div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                      {formatRupiah(activePlan.targetBudget)}
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#ffffff', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>{t('Sisa Dibutuhkan', 'Still Needed')}</div>
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
              const motivation = getMotivationContent(savedPercentage, isExpired, activePlan.destination, t);
              return (
                <div style={{ backgroundColor: motivation.bg, borderRadius: '20px', padding: '18px 24px', border: `1px solid ${motivation.border}`, marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <motivation.icon size={24} color={motivation.titleColor} style={{ flexShrink: 0 }} aria-hidden="true" />
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
                  <ListChecks size={18} color="#0f8b8d" /> {t('Checklist persiapan trip', 'Trip prep checklist')}
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
                            {checklistLabel(item.label)}
                          </span>
                        </div>

                        {/* Automated items show system badge (cannot be deleted/edited) */}
                        {isAutomated ? (
                          <span 
                            title={t('Item ini diperbarui otomatis oleh sistem', 'Updated automatically by the system')}
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
                            <ShieldCheck size={12} /> {t('Otomatis', 'Auto')}
                          </span>
                        ) : (
                          /* Manual items have Edit & Hapus icons (Point 3) */
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingChecklistId(item.id);
                                setEditingChecklistLabel(checklistLabel(item.label));
                              }}
                              title="Edit item"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#0f8b8d' }}
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={(e) => handleDeleteChecklistItem(e, item.id)}
                              disabled={isBusy}
                              aria-busy={pending === `delete-checklist-${item.id}`}
                              title={t('Hapus item', 'Delete item')}
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
                    placeholder={t('Tambah item checklist baru...', 'Add a checklist item...')}
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
                    disabled={isBusy}
                    aria-busy={pending === 'add-checklist'}
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
                    {pending === 'add-checklist' ? <><LoaderCircle size={14} className="btn-spinner" aria-hidden="true" /> {t('Menyimpan...', 'Saving...')}</> : t('Tambah', 'Add')}
                  </button>
                </form>
              </div>

              {/* Scrollable Riwayat Tabungan Bulanan with Edit & Hapus options (Point 3) */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 6px 20px rgba(0,0,0,0.03)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Wallet size={18} color="#0f8b8d" /> {t('Riwayat Catatan Tabungan', 'Savings History')}
                </h3>

                {activePlan.savingsLogs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px 0', color: '#94a3b8', fontSize: '13px' }}>
                    {lang === 'en'
                      ? <>No savings logged yet.<br />Click <strong>"+ Log Savings"</strong> above.</>
                      : <>Belum ada tabungan yang dicatat.<br />Klik tombol <strong>"+ Catat Tabungan Bulan Ini"</strong> di atas.</>}
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
                          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>{formatDateIndo(log.date, locale)}</div>
                          <div style={{ fontSize: '12.5px', color: '#334155', fontWeight: '700' }}>{!log.note || log.note === 'Tabungan bulanan' ? t('Tabungan bulanan', 'Monthly savings') : log.note}</div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <strong style={{ fontSize: '13.5px', color: '#10b981', fontWeight: '800' }}>
                            + {formatRupiah(log.amount)}
                          </strong>

                          {/* Edit & Hapus options for savings logs (Point 3) */}
                          <button
                            onClick={() => handleOpenSavingsModal(log)}
                            title={t('Edit Catatan', 'Edit Entry')}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#0f8b8d' }}
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={(e) => handleDeleteSavingsLog(e, log.id)}
                            disabled={isBusy}
                            aria-busy={pending === `delete-log-${log.id}`}
                            title={t('Hapus Catatan', 'Delete Entry')}
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
                  <Compass size={20} color="#0f8b8d" /> {t('Rekomendasi Paket Open Trip ke', 'Recommended Open Trips to')} {activePlan.destination}
                </h3>
                <button
                  onClick={() => autoSaveDraftAndNavigate('cari-trip')}
                  disabled={isBusy}
                  aria-busy={pending === 'navigate'}
                  style={{ background: 'none', border: 'none', color: '#0f8b8d', fontSize: '13px', fontWeight: '800', cursor: 'pointer' }}
                >
                  {pending === 'navigate' ? <><LoaderCircle size={14} className="btn-spinner" aria-hidden="true" /> {t('Menyimpan...', 'Saving...')}</> : <>{t('Lihat Semua Paket', 'See All Trips')} &gt;</>}
                </button>
              </div>

              {loadingPackages ? (
                <SkeletonCards count={3} minWidth={260} label={t('Memuat rekomendasi paket', 'Loading recommended trips')} />
              ) : matchingPackages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '13.5px' }}>
                  {t('Belum ada paket trip spesifik untuk lokasi', 'No trips found yet for')} <strong>{activePlan.destination}</strong>. {t('Silakan cek halaman cari trip untuk pilihan destinasi populer lainnya.', 'Check the trip search page for other popular destinations.')}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                  {matchingPackages.slice(0, 3).map(pkg => (
                    <div
                      key={pkg.id}
                      onClick={() => {
                        // Paket yang diklik harus dipilih dulu; tanpa ini halaman
                        // detail terbuka kosong atau menampilkan paket sebelumnya.
                        setSelectedPackageForDetail(pkg);
                        autoSaveDraftAndNavigate('paket-detail');
                      }}
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
                        <TripImage src={getTripImage(pkg)} alt={pkg.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <span style={{ position: 'absolute', top: '8px', left: '8px', backgroundColor: '#0f8b8d', color: 'white', fontSize: '10px', fontWeight: '800', padding: '3px 8px', borderRadius: '6px' }}>
                          {pkg.tripType || 'Open Trip'}
                        </span>
                      </div>
                      <div style={{ padding: '14px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0', lineHeight: 1.3 }}>{pkg.name}</h4>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 10px 0' }}>{pkg.destination}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                          <span style={{ fontSize: '12px', color: '#d97706', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Star size={13} aria-hidden="true" /> {pkg.rating && Number(pkg.rating) > 0 ? Number(pkg.rating).toFixed(1) : t('Baru', 'New')}</span>
                          <strong style={{ fontSize: '14px', color: '#0f8b8d', fontWeight: '800' }}>{typeof pkg.price === 'number' ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(pkg.price) : pkg.price}</strong>
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
                  {t('Selesai Menyusun Rencana Trip?', 'Done planning your trip?')}
                </div>
                <div style={{ fontSize: '12.5px', color: '#64748b' }}>
                  {t('Simpan rencana ini agar tersimpan permanen di akunmu dan bisa dipantau kapan saja.', 'Save this plan to your account so you can check on it anytime.')}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  onClick={handleCancelPlan}
                  disabled={isBusy}
                  aria-busy={pending === 'cancel-plan'}
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
                  {pending === 'cancel-plan' ? <><LoaderCircle size={14} className="btn-spinner" aria-hidden="true" /> {t('Memproses...', 'Processing...')}</> : t('Batalkan Rencana Trip', 'Cancel Trip Plan')}
                </button>

                <button
                  onClick={handleSavePlanPermanent}
                  disabled={isBusy}
                  aria-busy={pending === 'save-plan'}
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
                  {pending === 'save-plan'
                    ? <><LoaderCircle size={14} className="btn-spinner" aria-hidden="true" /> {t('Menyimpan...', 'Saving...')}</>
                    : <><Save size={16} /> {t('Simpan Rencana Trip', 'Save Trip Plan')}</>}
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
                <Wallet size={20} color="#0f8b8d" /> {editingLogId ? t('Edit Catatan Tabungan', 'Edit Savings Entry') : t('Catat Tabungan Bulan Ini', "Log This Month's Savings")}
              </h3>
              
              <form onSubmit={handleSaveSavings}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '6px' }}>
                    {t('Nominal Disisihkan (Rp)', 'Amount Saved (Rp)')} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder={t('Contoh: 500.000', 'e.g. 500.000')}
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
                    {t('Catatan Opsional', 'Note (optional)')}
                  </label>
                  <input
                    type="text"
                    placeholder={t('Contoh: Gaji bulan ini, Bonus proyek...', "e.g. This month's salary, project bonus...")}
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
                    disabled={pending === 'save-savings'}
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
                    {t('Batal', 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={isBusy}
                    aria-busy={pending === 'save-savings'}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '12px',
                      border: 'none',
                      backgroundColor: '#0f8b8d',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 12px rgba(15,139,141,0.25)'
                    }}
                  >
                    {pending === 'save-savings' ? <><LoaderCircle size={14} className="btn-spinner" aria-hidden="true" /> {t('Menyimpan...', 'Saving...')}</> : t('Simpan Tabungan', 'Save Entry')}
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
                <Edit3 size={20} color="#0f8b8d" /> {t('Edit Item Checklist', 'Edit Checklist Item')}
              </h3>
              
              <form onSubmit={handleSaveEditChecklist}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '6px' }}>
                    {t('Label Item Checklist', 'Item Label')}
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
                    disabled={pending === 'edit-checklist'}
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
                    {t('Batal', 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={isBusy}
                    aria-busy={pending === 'edit-checklist'}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '12px',
                      border: 'none',
                      backgroundColor: '#0f8b8d',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {pending === 'edit-checklist' ? <><LoaderCircle size={14} className="btn-spinner" aria-hidden="true" /> {t('Menyimpan...', 'Saving...')}</> : t('Simpan Perubahan', 'Save Changes')}
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
                <Info size={20} color="#0284c7" /> {t('Informasi Item Sistem Otomatis', 'About Automatic Items')}
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
                  {t('Mengerti', 'Got it')}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
