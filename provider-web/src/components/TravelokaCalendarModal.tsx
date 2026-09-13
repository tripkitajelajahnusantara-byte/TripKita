import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, Check } from 'lucide-react';

interface TravelokaCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  startDateIso: string;
  endDateIso: string;
  onSelectRange: (startIso: string, endIso: string) => void;
  bookedDates: string[];
  minDateIso: string;
  tripType?: string;
  durationDays?: number;
}

export const TravelokaCalendarModal: React.FC<TravelokaCalendarModalProps> = ({
  isOpen,
  onClose,
  startDateIso,
  endDateIso,
  onSelectRange,
  bookedDates,
  minDateIso,
  tripType = 'Private Trip'
}) => {
  if (!isOpen) return null;

  const baseDate = new Date(minDateIso || new Date());
  const [monthOffset, setMonthOffset] = useState(0);

  const getMonthDate = (offset: number) => {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + offset, 1);
    return d;
  };

  const currentMonth = getMonthDate(monthOffset);
  const nextMonth = getMonthDate(monthOffset + 1);

  const formatDayHeader = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const days = ['Ming', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const getDaysInMonthGrid = (year: number, monthIdx: number) => {
    const firstDay = new Date(year, monthIdx, 1);
    const lastDay = new Date(year, monthIdx + 1, 0);
    const daysInMonth = lastDay.getDate();

    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek < 0) startDayOfWeek = 6;

    const grid: Array<{ day: number | null; dateIso: string | null }> = [];
    
    for (let i = 0; i < startDayOfWeek; i++) {
      grid.push({ day: null, dateIso: null });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const monthStr = String(monthIdx + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      grid.push({ day: d, dateIso: `${year}-${monthStr}-${dayStr}` });
    }

    return grid;
  };

  const handleDayClick = (dateIso: string) => {
    // If a single date is currently selected (start === end) and new date >= start, form a date range!
    if (startDateIso && endDateIso && startDateIso === endDateIso && dateIso >= startDateIso) {
      onSelectRange(startDateIso, dateIso);
    } else {
      // Otherwise reset to single date selection
      onSelectRange(dateIso, dateIso);
    }
  };

  const isDateInRange = (dateIso: string) => {
    if (!startDateIso || !endDateIso) return false;
    return dateIso >= startDateIso && dateIso <= endDateIso;
  };

  const isBooked = (dateIso: string) => {
    return bookedDates.includes(dateIso);
  };

  const isBeforeMinDate = (dateIso: string) => {
    return dateIso < minDateIso;
  };

  const monthsIndoFull = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  const renderMonthCalendar = (year: number, monthIdx: number, monthTitle: string) => {
    const grid = getDaysInMonthGrid(year, monthIdx);
    const weekDays = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

    return (
      <div style={{ flex: '1 1 280px' }}>
        <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', textAlign: 'center', marginBottom: '14px' }}>
          {monthTitle}
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '8px' }}>
          {weekDays.map((wd, idx) => (
            <span key={wd} style={{ fontSize: '11.5px', fontWeight: '700', color: idx === 6 ? '#ef4444' : '#64748b' }}>
              {wd}
            </span>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {grid.map((cell, idx) => {
            if (!cell.day || !cell.dateIso) {
              return <div key={`empty-${idx}`} style={{ height: '36px' }} />;
            }

            const dateIso = cell.dateIso;
            const inBooked = isBooked(dateIso);
            const disabled = isBeforeMinDate(dateIso) || inBooked;
            const isStart = dateIso === startDateIso;
            const isEnd = dateIso === endDateIso;
            const inRange = isDateInRange(dateIso);

            if (inBooked) {
              return (
                <button
                  key={dateIso}
                  type="button"
                  disabled={true}
                  title="Tanggal Terbooking (Full)"
                  style={{
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: '#fee2e2',
                    color: '#ef4444',
                    border: '1.5px dashed #fca5a5',
                    fontSize: '12.5px',
                    fontWeight: '700',
                    cursor: 'not-allowed',
                    pointerEvents: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: '1.1'
                  }}
                >
                  <s style={{ textDecoration: 'line-through' }}>{cell.day}</s>
                  <span style={{ fontSize: '7.5px', fontWeight: '800', color: '#dc2626' }}>FULL</span>
                </button>
              );
            }

            if (disabled) {
              return (
                <div
                  key={dateIso}
                  style={{
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12.5px',
                    color: '#cbd5e1',
                    fontWeight: '600',
                    cursor: 'not-allowed'
                  }}
                >
                  {cell.day}
                </div>
              );
            }

            return (
              <button
                key={dateIso}
                type="button"
                onClick={() => handleDayClick(dateIso)}
                style={{
                  height: '36px',
                  borderRadius: isStart ? '8px 0 0 8px' : isEnd ? '0 8px 8px 0' : inRange ? '0' : '8px',
                  backgroundColor: isStart || isEnd ? '#007bff' : inRange ? '#e0f2fe' : '#ffffff',
                  color: isStart || isEnd ? '#ffffff' : inRange ? '#0284c7' : '#0f172a',
                  border: isStart || isEnd ? 'none' : inRange ? 'none' : '1px solid #e2e8f0',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {cell.day}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          maxWidth: '680px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Title (Traveloka Style Gambar 1) */}
        <div style={{ backgroundColor: '#ffffff', padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalendarIcon size={20} color="#007bff" /> Tanggal Perjalanan ({tripType})
            </h3>
            <span style={{ fontSize: '12.5px', color: '#64748b' }}>
              Pilih tanggal pada kalender. Tanggal tercoret (merah) adalah tanggal terbooking (FULL).
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Selected Date Range Header */}
        <div style={{ backgroundColor: '#f8fafc', padding: '14px 24px', borderBottom: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #007bff' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '2px' }}>Tanggal Mulai</span>
            <strong style={{ fontSize: '13.5px', color: '#007bff' }}>{formatDayHeader(startDateIso)}</strong>
          </div>
          <div style={{ backgroundColor: '#ffffff', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #007bff' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '2px' }}>Tanggal Selesai</span>
            <strong style={{ fontSize: '13.5px', color: '#007bff' }}>{formatDayHeader(endDateIso)}</strong>
          </div>
        </div>

        {(() => {
          if (!startDateIso || !endDateIso) return null;
          const start = new Date(startDateIso).getTime();
          const end = new Date(endDateIso).getTime();
          const bookedInModal = bookedDates.filter(bStr => {
            const bTime = new Date(bStr).getTime();
            return bTime >= start && bTime <= end;
          });

          if (bookedInModal.length === 0) return null;

          return (
            <div style={{ backgroundColor: '#fef2f2', padding: '10px 24px', borderBottom: '1px solid #fca5a5', color: '#991b1b', fontSize: '12px', fontWeight: '700', lineHeight: '1.4' }}>
              ⚠️ Rentang tanggal pilihan Anda ({formatDayHeader(startDateIso)} - {formatDayHeader(endDateIso)}) mengandung tanggal yang sudah terbooking ({bookedInModal.map(d => formatDayHeader(d)).join(', ')} FULL). Silakan pilih tanggal yang tersedia.
            </div>
          );
        })()}

        {/* Month Navigation & Grid */}
        <div style={{ padding: '24px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'absolute', top: '24px', left: '24px', right: '24px', pointerEvents: 'none' }}>
            <button
              type="button"
              onClick={() => setMonthOffset(m => m - 1)}
              style={{
                pointerEvents: 'auto',
                backgroundColor: '#ffffff',
                border: '1.5px solid #cbd5e1',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
              }}
            >
              <ChevronLeft size={18} color="#0f172a" />
            </button>

            <button
              type="button"
              onClick={() => setMonthOffset(m => m + 1)}
              style={{
                pointerEvents: 'auto',
                backgroundColor: '#ffffff',
                border: '1.5px solid #cbd5e1',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
              }}
            >
              <ChevronRight size={18} color="#0f172a" />
            </button>
          </div>

          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', paddingTop: '10px' }}>
            {renderMonthCalendar(
              currentMonth.getFullYear(),
              currentMonth.getMonth(),
              `${monthsIndoFull[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`
            )}

            {renderMonthCalendar(
              nextMonth.getFullYear(),
              nextMonth.getMonth(),
              `${monthsIndoFull[nextMonth.getMonth()]} ${nextMonth.getFullYear()}`
            )}
          </div>
        </div>

        {/* Bottom Legend & Apply Button */}
        <div style={{ backgroundColor: '#f8fafc', padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11.5px', color: '#64748b' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#007bff', display: 'inline-block' }} /> Terpilih
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#fee2e2', border: '1px dashed #fca5a5', display: 'inline-block' }} />
              <s style={{ textDecoration: 'line-through', color: '#ef4444', fontWeight: '700' }}>Terbooking (FULL)</s>
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 24px',
              borderRadius: '10px',
              backgroundColor: '#007bff',
              color: '#ffffff',
              border: 'none',
              fontSize: '13.5px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(0, 123, 255, 0.25)'
            }}
          >
            <Check size={16} /> Terapkan Tanggal
          </button>
        </div>
      </div>
    </div>
  );
};
