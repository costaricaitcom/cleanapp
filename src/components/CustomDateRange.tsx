import React, { useState, useEffect } from 'react';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface CustomDateRangeProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  minDate?: Date;
}

export default function CustomDateRange({ value, onChange, minDate = new Date() }: CustomDateRangeProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [selectionMode, setSelectionMode] = useState<'start' | 'end'>('start');

  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const quickPresets = [
    { label: 'Hoy', getRange: () => ({ startDate: new Date(), endDate: new Date() }) },
    { label: 'Esta semana', getRange: () => {
      const today = new Date();
      const start = new Date(today);
      start.setDate(today.getDate() - today.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { startDate: start, endDate: end };
    }},
    { label: 'Próxima semana', getRange: () => {
      const today = new Date();
      const start = new Date(today);
      start.setDate(today.getDate() - today.getDay() + 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { startDate: start, endDate: end };
    }},
    { label: 'Este mes', getRange: () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { startDate: start, endDate: end };
    }}
  ];

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfWeek = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const isSameDate = (date1: Date, date2: Date) => {
    return formatDate(date1) === formatDate(date2);
  };

  const isInRange = (date: Date) => {
    if (!value.startDate || !value.endDate) return false;
    const dateStr = formatDate(date);
    const startStr = formatDate(value.startDate);
    const endStr = formatDate(value.endDate);
    return dateStr >= startStr && dateStr <= endStr;
  };

  const isStartDate = (date: Date) => {
    return value.startDate && isSameDate(date, value.startDate);
  };

  const isEndDate = (date: Date) => {
    return value.endDate && isSameDate(date, value.endDate);
  };

  const isDisabled = (date: Date) => {
    return date < minDate;
  };

  const handleDateClick = (date: Date) => {
    if (isDisabled(date)) return;

    if (selectionMode === 'start') {
      // Selecting start date
      onChange({ startDate: date, endDate: date });
      setSelectionMode('end');
    } else {
      // Selecting end date
      if (date < value.startDate) {
        // If selected date is before start date, swap them
        onChange({ startDate: date, endDate: value.startDate });
      } else {
        // Normal end date selection
        onChange({ startDate: value.startDate, endDate: date });
      }
      setSelectionMode('start');
    }
  };

  const handleDateHover = (date: Date) => {
    if (!isDisabled(date)) {
      setHoverDate(date);
    }
  };

  const getDateClass = (date: Date) => {
    let classes = "w-8 h-8 flex items-center justify-center text-sm cursor-pointer transition-colors";
    
    if (isDisabled(date)) {
      classes += " text-gray-500 cursor-not-allowed";
    } else if (isStartDate(date)) {
      classes += " text-white border-2 border-blue-400 rounded-full font-bold bg-transparent";
    } else if (isEndDate(date)) {
      classes += " text-white border-2 border-blue-400 rounded-full font-bold bg-transparent";
    } else if (isInRange(date)) {
      classes += " bg-gray-600/30 text-white";
    } else if (hoverDate && isSameDate(date, hoverDate)) {
      classes += " bg-gray-600 text-white rounded";
    } else {
      classes += " text-gray-300 hover:bg-gray-700 hover:text-white rounded";
    }
    
    return classes;
  };

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDayOfWeek = getFirstDayOfWeek(currentYear, currentMonth);
    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8" />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      days.push(
        <div
          key={day}
          className={getDateClass(date)}
          onClick={() => handleDateClick(date)}
          onMouseEnter={() => handleDateHover(date)}
          onMouseLeave={() => setHoverDate(null)}
        >
          {day}
        </div>
      );
    }

    return days;
  };

  return (
    <div 
      className="custom-date-range-calendar bg-gray-900 p-4 w-80" 
      style={{ 
        borderRadius: '8px',
        backgroundColor: '#111827'
      }}
    >
      {/* Quick Presets */}
      <div className="mb-4">
        <div className="text-gray-400 text-xs mb-2">Presets rápidos:</div>
        <div className="flex flex-wrap gap-1">
          {quickPresets.map((preset, index) => (
            <button
              key={index}
              onClick={() => {
                onChange(preset.getRange());
                setSelectionMode('start');
              }}
              className="px-2 py-1 text-xs bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Selection Mode Indicator */}
      <div className="mb-2 text-xs text-gray-400 text-center">
        {selectionMode === 'start' ? 'Selecciona fecha de inicio' : 'Selecciona fecha de fin'}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="text-gray-400 hover:text-white p-1 rounded"
        >
          ‹
        </button>
        <h3 className="text-white font-medium">
          {months[currentMonth]} {currentYear}
        </h3>
        <button
          onClick={nextMonth}
          className="text-gray-400 hover:text-white p-1 rounded"
        >
          ›
        </button>
      </div>

      {/* Week days */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-gray-400 text-xs font-medium">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {renderCalendar()}
      </div>

      {/* Selected range display */}
      {value.startDate && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="text-gray-400 text-sm">
            <div className="flex justify-between items-center">
              <span>Inicio: {value.startDate.toLocaleDateString()}</span>
              {value.endDate && value.endDate !== value.startDate && (
                <span>Fin: {value.endDate.toLocaleDateString()}</span>
              )}
            </div>
          </div>
          
          {/* Duration display */}
          {value.endDate && value.endDate !== value.startDate && (
            <div className="text-xs text-gray-500 mt-1 text-center">
              {Math.ceil((value.endDate.getTime() - value.startDate.getTime()) / (1000 * 60 * 60 * 24))} días
            </div>
          )}
        </div>
      )}
    </div>
  );
} 