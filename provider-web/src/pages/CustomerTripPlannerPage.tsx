import React, { useState, useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { request } from '../utils/api';
import type { TripPlan, TripChecklistItem, TripSavingsLog, PackageItem } from '../types';
import { Target, Calendar, Users, Wallet, Plus, CheckCircle2, Circle, Sparkles, TrendingUp, Compass, ArrowRight, RefreshCw } from 'lucide-react';

export const CustomerTripPlannerPage: React.FC = () => {
  const { customerProfile, navigateTo } = useNavigation();

  // Storage key based on customer ID
  const storageKey = customerProfile ? `tementrip_plan_cust_${customerProfile.id}` : 'tementrip_plan_guest';

  // State
  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [destination, setDestination] = useState('');
  const [targetMonth, setTargetMonth] = useState('');
  const [participants, setParticipants] = useState<number>(2);
  const [targetBudget, setTargetBudget] = useState<string>('');

  // Savings log modal / input
  const [showSavingsModal, setShowSavingsModal] = useState(false);
  const [savingsInput, setSavingsInput] = useState<string>('');
  const [savingsNote, setSavingsNote] = useState<string>('');

  // Custom checklist input
  const [newChecklistItem, setNewChecklistItem] = useState('');

  // Matching packages
  const [matchingPackages, setMatchingPackages] = useState<PackageItem[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);

  // Generate available future months starting from current month
  const generateFutureMonths = () => {
    const months = [];
    const now = new Date();
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    for (let i = 0; i < 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const val = `${yyyy}-${mm}`;
      const label = `${monthNames[d.getMonth()]} ${yyyy}`;
      months.push({ val, label });
    }
    return months;
  };

  const availableMonths = generateFutureMonths();

  // Load existing plan from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed: TripPlan = JSON.parse(saved);
        setPlan(parsed);
      } catch (e) {
        console.error('Failed to parse trip plan', e);
      }
    } else {
      setIsEditing(true);
      if (availableMonths.length > 0) {
        setTargetMonth(availableMonths[2]?.val || availableMonths[0].val);
      }
    }
  }, [storageKey]);

  // Fetch matching packages when plan exists
  useEffect(() => {
    if (plan && plan.destination) {
      setLoadingPackages(true);
      request('/public/packages')
        .then((data: any) => {
          const list: PackageItem[] = Array.isArray(data) ? data : (data?.data || []);
          const destLower = plan.destination.toLowerCase();
          const filtered = list.filter(pkg =>
            pkg.destination.toLowerCase().includes(destLower) ||
            pkg.name.toLowerCase().includes(destLower)
          );
          setMatchingPackages(filtered.length > 0 ? filtered : list.slice(0, 3));
        })
        .catch(err => console.error(err))
        .finally(() => setLoadingPackages(false));
    }
  }, [plan?.destination]);

  // Save / Update Plan
  const handleSavePlan = (e: React.FormEvent) => {
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

    const selectedMonthObj = availableMonths.find(m => m.val === targetMonth);
    const monthLabel = selectedMonthObj ? selectedMonthObj.label : targetMonth;

    const defaultChecklist: TripChecklistItem[] = [
      { id: '1', label: 'Tentukan Destinasi & Target Budget Liburan', completed: true },
      { id: '2', label: 'Capai 50% Tabungan Perjalanan', completed: (plan?.savedAmount || 0) >= (numBudget * 0.5) },
      { id: '3', label: 'Capai 100% Target Tabungan', completed: (plan?.savedAmount || 0) >= numBudget },
      { id: '4', label: 'Cari & Pesan Paket Open Trip di TemenTrip', completed: false },
      { id: '5', label: 'Siapkan Barang Bawaan & Pakaian Liburan', completed: false },
      { id: '6', label: 'Siap Berangkat & Nikmati Liburan! 🥳', completed: false },
    ];

    const newPlan: TripPlan = {
      id: plan?.id || `plan_${Date.now()}`,
      destination: destination.trim(),
      targetMonth,
      targetMonthLabel: monthLabel,
      participants: Number(participants) || 1,
      targetBudget: numBudget,
      savedAmount: plan?.savedAmount || 0,
      checklist: plan?.checklist && plan.checklist.length > 0 ? plan.checklist : defaultChecklist,
      savingsLogs: plan?.savingsLogs || [],
      createdAt: plan?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setPlan(newPlan);
    localStorage.setItem(storageKey, JSON.stringify(newPlan));
    setIsEditing(false);
  };

  // Add Savings Log
  const handleAddSavings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan) return;
    const amount = parseInt(savingsInput.replace(/\D/g, ''), 10);
    if (isNaN(amount) || amount <= 0) {
      alert('Masukkan nominal tabungan yang valid.');
      return;
    }

    const newSavedAmount = plan.savedAmount + amount;
    const newLog: TripSavingsLog = {
      id: `log_${Date.now()}`,
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      amount,
      note: savingsNote.trim() || 'Tabungan bulanan'
    };

    // Update checklist milestones
    const updatedChecklist = plan.checklist.map(item => {
      if (item.id === '2' && newSavedAmount >= plan.targetBudget * 0.5) {
        return { ...item, completed: true };
      }
      if (item.id === '3' && newSavedAmount >= plan.targetBudget) {
        return { ...item, completed: true };
      }
      return item;
    });

    const updatedPlan: TripPlan = {
      ...plan,
      savedAmount: newSavedAmount,
      checklist: updatedChecklist,
      savingsLogs: [newLog, ...plan.savingsLogs],
      updatedAt: new Date().toISOString()
    };

    setPlan(updatedPlan);
    localStorage.setItem(storageKey, JSON.stringify(updatedPlan));
    setShowSavingsModal(false);
    setSavingsInput('');
    setSavingsNote('');
  };

  // Toggle Checklist
  const handleToggleChecklist = (id: string) => {
    if (!plan) return;
    const updatedChecklist = plan.checklist.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    const updatedPlan: TripPlan = { ...plan, checklist: updatedChecklist };
    setPlan(updatedPlan);
    localStorage.setItem(storageKey, JSON.stringify(updatedPlan));
  };

  // Add Custom Checklist Item
  const handleAddChecklistItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan || !newChecklistItem.trim()) return;
    const newItem: TripChecklistItem = {
      id: `chk_${Date.now()}`,
      label: newChecklistItem.trim(),
      completed: false
    };
    const updatedPlan: TripPlan = {
      ...plan,
      checklist: [...plan.checklist, newItem]
    };
    setPlan(updatedPlan);
    localStorage.setItem(storageKey, JSON.stringify(updatedPlan));
    setNewChecklistItem('');
  };

  // Format currency
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  // Calculate percentage
  const savedPercentage = plan ? Math.min(100, Math.round((plan.savedAmount / plan.targetBudget) * 100)) : 0;
  const remainingBudget = plan ? Math.max(0, plan.targetBudget - plan.savedAmount) : 0;

  // Check if target month is current or past
  const now = new Date();
  const currentMonthIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const isTargetMonthReached = plan ? plan.targetMonth <= currentMonthIso : false;

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '32px 16px' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        
        {/* Header Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Target size={28} color="#0f8b8d" /> Rencana Trip & Target Tabungan
            </h1>
            <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0 }}>
              Susun liburan impianmu, atur target tabungan bulanan, dan pantau persiapan trip dengan mudah.
            </p>
          </div>

          {plan && !isEditing && (
            <button
              onClick={() => {
                setDestination(plan.destination);
                setTargetMonth(plan.targetMonth);
                setParticipants(plan.participants);
                setTargetBudget(plan.targetBudget.toString());
                setIsEditing(true);
              }}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                padding: '8px 16px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: '700',
                color: '#334155',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
              }}
            >
              <RefreshCw size={14} color="#0f8b8d" /> Edit Rencana
            </button>
          )}
        </div>

        {/* 1. Form Edit / Create Plan */}
        {(isEditing || !plan) ? (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '28px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Compass size={20} color="#0f8b8d" /> {plan ? 'Edit Rencana Trip' : 'Buat Rencana Trip Impian Baru'}
            </h2>

            <form onSubmit={handleSavePlan} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
              
              {/* Destinasi */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Destinasi Impian <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Bali, Labuan Bajo, Raja Ampat, Bandung..."
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    fontWeight: '600',
                    outline: 'none'
                  }}
                  required
                />
              </div>

              {/* Rencana Waktu (Bulan & Tahun) */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Rencana Bulan Keberangkatan <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={targetMonth}
                  onChange={(e) => setTargetMonth(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    fontWeight: '600',
                    outline: 'none',
                    backgroundColor: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  {availableMonths.map(m => (
                    <option key={m.val} value={m.val}>{m.label}</option>
                  ))}
                </select>
                <span style={{ fontSize: '10.5px', color: '#94a3b8', display: 'block', marginTop: '4px' }}>
                  Bulan sebelum saat ini di-lock secara otomatis.
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
                    outline: 'none'
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
                    outline: 'none'
                  }}
                  required
                />
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                {plan && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    style={{
                      padding: '10px 20px',
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
                )}
                <button
                  type="submit"
                  style={{
                    padding: '10px 24px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: '#0f8b8d',
                    color: '#ffffff',
                    fontSize: '13.5px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(15,139,141,0.25)'
                  }}
                >
                  Simpan Rencana Trip
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {/* 2. Main Dashboard View */}
        {plan && !isEditing && (
          <div>
            {/* Top Overview Cards */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.04)', marginBottom: '24px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <span style={{ backgroundColor: '#e6f4f4', color: '#0f8b8d', fontSize: '11px', fontWeight: '800', padding: '4px 10px', borderRadius: '20px', textTransform: 'uppercase' }}>
                    Target Liburan
                  </span>
                  <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '8px 0 2px 0' }}>
                    {plan.destination}
                  </h2>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12.5px', color: '#64748b', fontWeight: '600' }}>
                    <span><Calendar size={14} style={{ display: 'inline', verticalAlign: '-2px', color: '#0f8b8d' }} /> {plan.targetMonthLabel}</span>
                    <span><Users size={14} style={{ display: 'inline', verticalAlign: '-2px', color: '#0f8b8d' }} /> {plan.participants} Peserta</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowSavingsModal(true)}
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
                  <Plus size={18} /> Catat Tabungan Bulan Ini
                </button>
              </div>

              {/* Progress Bar */}
              <div style={{ backgroundColor: '#f8fafc', borderRadius: '16px', padding: '16px', border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <TrendingUp size={16} color="#0f8b8d" /> Progres Tabungan
                  </span>
                  <strong style={{ fontSize: '16px', fontWeight: '900', color: '#0f8b8d' }}>
                    {savedPercentage}%
                  </strong>
                </div>

                <div style={{ height: '14px', backgroundColor: '#e2e8f0', borderRadius: '10px', overflow: 'hidden', marginBottom: '12px' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${savedPercentage}%`,
                      backgroundColor: savedPercentage >= 100 ? '#10b981' : '#0f8b8d',
                      borderRadius: '10px',
                      transition: 'width 0.5s ease-in-out'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', textAlign: 'center' }}>
                  <div style={{ backgroundColor: '#ffffff', padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Terkumpul</span>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#10b981' }}>{formatRupiah(plan.savedAmount)}</div>
                  </div>
                  <div style={{ backgroundColor: '#ffffff', padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Target Total</span>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>{formatRupiah(plan.targetBudget)}</div>
                  </div>
                  <div style={{ backgroundColor: '#ffffff', padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Sisa Dibutuhkan</span>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: remainingBudget > 0 ? '#ef4444' : '#10b981' }}>
                      {remainingBudget > 0 ? formatRupiah(remainingBudget) : 'Lunas 🎉'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Motivational Alert Box */}
            <div
              style={{
                borderRadius: '20px',
                padding: '20px',
                marginBottom: '24px',
                backgroundColor: savedPercentage >= 100 ? '#ecfdf5' : (isTargetMonthReached ? '#fff7ed' : '#e6f4f4'),
                border: `1.5px solid ${savedPercentage >= 100 ? '#a7f3d0' : (isTargetMonthReached ? '#fed7aa' : '#b2e2e2')}`,
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}
            >
              <div style={{ fontSize: '32px' }}>
                {savedPercentage >= 100 ? '🥳' : (isTargetMonthReached ? '⏳' : '💪')}
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '14.5px', fontWeight: '800', color: savedPercentage >= 100 ? '#065f46' : (isTargetMonthReached ? '#9a3412' : '#0d5c5e') }}>
                  {savedPercentage >= 100
                    ? 'SELAMAT! Target Tabungan 100% Terkumpul!'
                    : (isTargetMonthReached ? 'Bulan Target Tiba, Tabungan Belum 100%' : 'Semangat! Tinggal Sedikit Lagi!')}
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: savedPercentage >= 100 ? '#047857' : (isTargetMonthReached ? '#c2410c' : '#0f8b8d'), lineHeight: 1.4 }}>
                  {savedPercentage >= 100
                    ? `Tabungan liburan kamu ke ${plan.destination} sudah terkumpul penuh (${formatRupiah(plan.savedAmount)}). Yuk langsung cari dan pesan paket trip di bawah ini!`
                    : (isTargetMonthReached
                        ? `Bulan target (${plan.targetMonthLabel}) sudah tiba namun tabungan baru ${savedPercentage}%. Jangan berkecil hati! Yuk tambah tabungan sedikit lagi atau undurkan target bulan agar trip-mu tetap terwujud!`
                        : `Ayo semangat! Tinggal sedikit lagi nih tabungan kamu terkumpul untuk liburan impian ke ${plan.destination}! Yuk sisihkan tabungan bulan ini! ✨`
                      )}
                </p>
              </div>

              {savedPercentage >= 100 && (
                <button
                  onClick={() => navigateTo('cari-trip')}
                  style={{
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Pesan Trip Sekarang <ArrowRight size={14} style={{ display: 'inline', verticalAlign: '-2px' }} />
                </button>
              )}
            </div>

            {/* Grid 2 Columns: Interactive Checklist & History Tabungan */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
              
              {/* Checklist Persiapan Liburan */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 6px 20px rgba(0,0,0,0.03)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} color="#0f8b8d" /> Checklist Persiapan Trip
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                  {plan.checklist.map(item => (
                    <div
                      key={item.id}
                      onClick={() => handleToggleChecklist(item.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        backgroundColor: item.completed ? '#f0fdf4' : '#f8fafc',
                        border: `1px solid ${item.completed ? '#bbf7d0' : '#e2e8f0'}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {item.completed ? (
                        <CheckCircle2 size={18} color="#10b981" />
                      ) : (
                        <Circle size={18} color="#94a3b8" />
                      )}
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: item.completed ? '700' : '600',
                          color: item.completed ? '#166534' : '#334155',
                          textDecoration: item.completed ? 'line-through' : 'none'
                        }}
                      >
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Add Custom Checklist Item */}
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

              {/* Riwayat Tabungan Bulanan */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 6px 20px rgba(0,0,0,0.03)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Wallet size={18} color="#0f8b8d" /> Riwayat Catatan Tabungan
                </h3>

                {plan.savingsLogs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: '13px' }}>
                    Belum ada tabungan yang dicatat.<br />Klik tombol <strong>"+ Catat Tabungan Bulan Ini"</strong> di atas.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '240px', overflowY: 'auto' }}>
                    {plan.savingsLogs.map(log => (
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
                          <div style={{ fontSize: '12.5px', color: '#334155', fontWeight: '700' }}>{log.note || 'Tabungan'}</div>
                        </div>
                        <strong style={{ fontSize: '13.5px', color: '#10b981', fontWeight: '800' }}>
                          + {formatRupiah(log.amount)}
                        </strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Rekomendasi Paket Open Trip Sesuaian */}
            <div style={{ marginTop: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Compass size={20} color="#0f8b8d" /> Rekomendasi Paket Open Trip ke {plan.destination}
                </h3>
                <button
                  onClick={() => navigateTo('cari-trip')}
                  style={{ background: 'none', border: 'none', color: '#0f8b8d', fontSize: '13px', fontWeight: '800', cursor: 'pointer' }}
                >
                  Lihat Semua Paket &gt;
                </button>
              </div>

              {loadingPackages ? (
                <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>Memuat rekomendasi paket...</div>
              ) : matchingPackages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', backgroundColor: '#ffffff', borderRadius: '16px', color: '#64748b', fontSize: '13px' }}>
                  Belum ada paket trip spesifik untuk lokasi ini. Silakan cek halaman paket trip untuk pilihan destinasi populer lainnya.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                  {matchingPackages.slice(0, 3).map(pkg => (
                    <div
                      key={pkg.id}
                      onClick={() => navigateTo('paket-detail')}
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
          </div>
        )}

        {/* Modal Catat Tabungan Bulan Ini */}
        {showSavingsModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', maxWidth: '400px', width: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wallet size={20} color="#0f8b8d" /> Catat Tabungan Bulan Ini
              </h3>
              
              <form onSubmit={handleAddSavings}>
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
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '15px',
                      fontWeight: '800',
                      color: '#10b981',
                      outline: 'none'
                    }}
                    required
                    autoFocus
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '6px' }}>
                    Catatan / Sumber (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Gaji bulan September, Bonus..."
                    value={savingsNote}
                    onChange={(e) => setSavingsNote(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowSavingsModal(false)}
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
                      fontSize: '13.5px',
                      fontWeight: '800',
                      cursor: 'pointer'
                    }}
                  >
                    Simpan Tabungan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
