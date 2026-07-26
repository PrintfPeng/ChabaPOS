import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isBefore,
  isAfter,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  subDays,
} from 'date-fns';
import { th } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, X, CalendarDays, Check } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface DatePickerWithRangeProps {
  className?: string;
  value: DateRange;
  onChange: (range: DateRange) => void;
  placeholder?: string;
}

export function DatePickerWithRange({
  className,
  value,
  onChange,
  placeholder = 'เลือกช่วงเวลา...',
}: DatePickerWithRangeProps) {
  const [isOpen, setIsOpen]         = useState(false);
  const [tempDate, setTempDate]     = useState<DateRange>({ ...value });
  const [currentMonth, setCurrentMonth] = useState<Date>(value.from || new Date());
  const [popupPos, setPopupPos]     = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef  = useRef<HTMLButtonElement>(null);
  const popupRef   = useRef<HTMLDivElement>(null);

  // Sync tempDate + currentMonth whenever the popover opens
  useEffect(() => {
    if (isOpen) {
      setTempDate({ ...value });
      setCurrentMonth(value.from || new Date());
    }
  }, [isOpen]);    // eslint-disable-line react-hooks/exhaustive-deps

  // Close when clicking outside either the trigger or the popup
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !wrapperRef.current?.contains(target) &&
        !popupRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPopupPos({ top: rect.bottom + 8, left: rect.left });
    }
    setIsOpen(prev => !prev);
  };

  // ── Calendar grid helpers ──────────────────────────────────────────────────
  const monthStart = startOfMonth(currentMonth);
  const monthEnd   = endOfMonth(monthStart);
  const startDate  = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate    = endOfWeek(monthEnd,   { weekStartsOn: 1 });
  const days       = eachDayOfInterval({ start: startDate, end: endDate });

  const handleDayClick = (day: Date) => {
    if (!tempDate.from || (tempDate.from && tempDate.to)) {
      setTempDate({ from: day, to: undefined });
    } else {
      if (isBefore(day, tempDate.from)) {
        setTempDate({ from: day, to: undefined });
      } else {
        setTempDate({ from: tempDate.from, to: day });
      }
    }
  };

  const handlePrevMonth  = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth  = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), parseInt(e.target.value), 1));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentMonth(new Date(parseInt(e.target.value), currentMonth.getMonth(), 1));
  };

  // Presets only update tempDate — they do NOT close or confirm
  const applyPreset = (preset: 'today' | 'yesterday' | 'week' | 'month' | 'clear') => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let next: DateRange;
    if      (preset === 'today')     next = { from: today, to: today };
    else if (preset === 'yesterday') { const y = subDays(today, 1); next = { from: y, to: y }; }
    else if (preset === 'week')      next = { from: subDays(today, 6), to: today };
    else if (preset === 'month')     next = { from: startOfMonth(today), to: endOfMonth(today) };
    else                             next = { from: undefined, to: undefined };

    setTempDate(next);
    if (next.from) setCurrentMonth(next.from);
  };

  // ── Confirm / Cancel ──────────────────────────────────────────────────────
  const handleConfirm = () => {
    onChange(tempDate);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempDate({ ...value });
    setIsOpen(false);
  };

  // ── Trigger button label (shows committed value, not tempDate) ────────────
  const displayLabel = () => {
    if (!value.from) return placeholder;
    const fromStr = format(value.from, 'd MMM yyyy', { locale: th });
    if (!value.to || isSameDay(value.from, value.to)) return fromStr;
    return `${fromStr} – ${format(value.to, 'd MMM yyyy', { locale: th })}`;
  };

  // Temp selection label shown in footer
  const tempLabel = () => {
    if (!tempDate.from) return 'ยังไม่ได้เลือกวันที่';
    const fromStr = format(tempDate.from, 'd MMM yyyy', { locale: th });
    if (!tempDate.to || isSameDay(tempDate.from, tempDate.to)) return fromStr;
    return `${fromStr} – ${format(tempDate.to, 'd MMM yyyy', { locale: th })}`;
  };

  const hasSelection = !!(tempDate.from);

  // ── Dropdowns ─────────────────────────────────────────────────────────────
  const currentYear = new Date().getFullYear();
  const years  = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
  const months = [
    { value: 0,  label: 'มกราคม'   },
    { value: 1,  label: 'กุมภาพันธ์' },
    { value: 2,  label: 'มีนาคม'   },
    { value: 3,  label: 'เมษายน'   },
    { value: 4,  label: 'พฤษภาคม'  },
    { value: 5,  label: 'มิถุนายน'  },
    { value: 6,  label: 'กรกฎาคม'  },
    { value: 7,  label: 'สิงหาคม'  },
    { value: 8,  label: 'กันยายน'  },
    { value: 9,  label: 'ตุลาคม'   },
    { value: 10, label: 'พฤศจิกายน' },
    { value: 11, label: 'ธันวาคม'  },
  ];

  const popup = isOpen
    ? ReactDOM.createPortal(
        <div
          ref={popupRef}
          style={{ position: 'fixed', top: popupPos.top, left: popupPos.left, zIndex: 9999 }}
          className="flex flex-col bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden animate-in fade-in-50 slide-in-from-top-2 duration-200 min-w-max"
        >
          <div className="flex flex-col md:flex-row">
            {/* ── Presets Sidebar ──────────────────────────────────────────── */}
            <div className="w-full md:w-36 bg-slate-50 p-3 flex flex-row md:flex-col gap-1 border-b md:border-b-0 md:border-r border-slate-100 shrink-0 overflow-x-auto no-scrollbar">
              {(
                [
                  { key: 'today',     label: 'วันนี้'       },
                  { key: 'yesterday', label: 'เมื่อวาน'     },
                  { key: 'week',      label: '7 วันล่าสุด'  },
                  { key: 'month',     label: 'เดือนนี้'     },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className="text-left text-xs font-bold text-slate-600 hover:text-primary hover:bg-white px-2.5 py-1.5 rounded-lg w-full transition-colors whitespace-nowrap"
                >
                  {label}
                </button>
              ))}
              <button
                onClick={() => applyPreset('clear')}
                className="text-left text-xs font-bold text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg w-full transition-colors whitespace-nowrap flex items-center gap-1 mt-auto"
              >
                <X className="w-3.5 h-3.5" />
                ล้างวันที่
              </button>
            </div>

            {/* ── Calendar Area ─────────────────────────────────────────────── */}
            <div className="p-4 w-72 shrink-0">
              {/* Month / Year nav */}
              <div className="flex items-center justify-between mb-4 gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 rounded-lg hover:bg-slate-100 border border-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex gap-1 items-center">
                  <select
                    value={currentMonth.getMonth()}
                    onChange={handleMonthChange}
                    className="bg-transparent border border-slate-100 hover:border-slate-300 rounded-lg py-1 px-1.5 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                  >
                    {months.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <select
                    value={currentMonth.getFullYear()}
                    onChange={handleYearChange}
                    className="bg-transparent border border-slate-100 hover:border-slate-300 rounded-lg py-1 px-1.5 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                  >
                    {years.map(y => (
                      <option key={y} value={y}>{y + 543}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 rounded-lg hover:bg-slate-100 border border-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'].map(wd => (
                  <span key={wd} className="text-[10px] font-bold text-slate-400">{wd}</span>
                ))}
              </div>

              {/* Days grid — uses tempDate for live preview */}
              <div className="grid grid-cols-7 gap-1">
                {days.map((day, i) => {
                  const isCurrentMonth   = day.getMonth() === currentMonth.getMonth();
                  const isSelectedStart  = tempDate.from && isSameDay(day, tempDate.from);
                  const isSelectedEnd    = tempDate.to   && isSameDay(day, tempDate.to);
                  const isSelected       = isSelectedStart || isSelectedEnd;
                  const inRange          =
                    tempDate.from &&
                    tempDate.to &&
                    isAfter(day, tempDate.from) &&
                    isBefore(day, tempDate.to);

                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleDayClick(day)}
                      className={cn(
                        'h-8 w-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer relative',
                        !isCurrentMonth && 'text-slate-300',
                        isCurrentMonth && !isSelected && !inRange && 'text-slate-700 hover:bg-slate-100',
                        inRange && 'bg-primary/10 text-primary rounded-none',
                        isSelected && 'bg-primary text-white shadow-md shadow-primary/20 scale-105 z-10',
                      )}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Footer: temp label + Cancel + Confirm ──────────────────────── */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/60">
            <span className={cn(
              'text-xs font-bold truncate min-w-0',
              hasSelection ? 'text-slate-700' : 'text-slate-400 italic',
            )}>
              {tempLabel()}
            </span>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-xl px-4 font-bold text-xs"
                onClick={handleCancel}
              >
                ยกเลิก
              </Button>
              <Button
                size="sm"
                className="h-8 rounded-xl px-4 font-black text-xs gap-1.5"
                disabled={!hasSelection}
                onClick={handleConfirm}
              >
                <Check className="w-3.5 h-3.5" />
                ยืนยัน
              </Button>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <div className={cn('relative inline-block text-left', className)} ref={wrapperRef}>
        {/* Trigger */}
        <button
          ref={buttonRef}
          type="button"
          onClick={handleToggle}
          className={cn(
            'flex items-center gap-2 h-9 px-4 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700',
            'hover:border-primary hover:text-primary transition-colors cursor-pointer whitespace-nowrap min-w-[200px]',
            isOpen && 'border-primary text-primary',
          )}
        >
          <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="truncate">{displayLabel()}</span>
        </button>
      </div>
      {popup}
    </>
  );
}
