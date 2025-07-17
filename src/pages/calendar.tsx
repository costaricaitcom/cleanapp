import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatDate(date: Date) {
  return date.toISOString().split("T")[0];
}

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export default function Calendar() {
  const auth = useAuth();
  const user = auth?.user;
  const loading = auth?.loading;
  const router = useRouter();

  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [tasks, setTasks] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
    // eslint-disable-next-line
  }, [user, currentMonth, currentYear]);

  async function fetchTasks() {
    setLoadingData(true);
    const start = new Date(currentYear, currentMonth, 1);
    const end = new Date(currentYear, currentMonth + 1, 0);
    const { data, error } = await supabase
      .from("cleaning_tasks")
      .select("*")
      .gte("scheduled_date", formatDate(start))
      .lte("scheduled_date", formatDate(end));
    if (!error) setTasks(data || []);
    setLoadingData(false);
  }

  if (loading) return <p className="text-center mt-8 text-lg">Loading...</p>;
  if (!user) return null;

  // Agrupar tareas por fecha para Entrada y Salida
  const entradaByDate: Record<string, any[]> = {};
  const salidaByDate: Record<string, any[]> = {};
  tasks.forEach(t => {
    if (t.scheduled_date) {
      if (!entradaByDate[t.scheduled_date]) entradaByDate[t.scheduled_date] = [];
      entradaByDate[t.scheduled_date].push(t);
    }
    if (t.end_date) {
      if (!salidaByDate[t.end_date]) salidaByDate[t.end_date] = [];
      salidaByDate[t.end_date].push(t);
    }
  });

  // Agrupar tareas por fecha
  const tasksByDate: Record<string, any[]> = {};
  tasks.forEach(t => {
    if (!tasksByDate[t.scheduled_date]) tasksByDate[t.scheduled_date] = [];
    tasksByDate[t.scheduled_date].push(t);
  });

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOfWeek = getFirstDayOfWeek(currentYear, currentMonth); // 0=Sunday

  // Construir celdas del calendario
  const calendarCells = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarCells.push(<div key={"empty-" + i} className="bg-[#23232a] rounded border min-h-[80px]"></div>);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDate(new Date(currentYear, currentMonth, day));
    calendarCells.push(
      <div key={dateStr} className="border rounded p-2 min-h-[80px] bg-[#18181c] flex flex-col">
        <div className="font-bold text-blue-700 text-sm mb-1">{day}</div>
        <div className="flex-1">
          {/* ENTRADA */}
          {(entradaByDate[dateStr] || []).map(t => (
            <div key={t.id + '-entrada'} className="text-xs rounded px-1 py-0.5 mb-1 font-semibold bg-green-200 text-green-900">
              Entrada
            </div>
          ))}
          {/* SALIDA */}
          {(salidaByDate[dateStr] || []).map(t => (
            <div key={t.id + '-salida'} className="text-xs rounded px-1 py-0.5 mb-1 font-semibold bg-red-200 text-red-900">
              Salida
            </div>
          ))}
          {/* Otras tareas (Retoque, Limpieza) */}
          {(tasksByDate[dateStr] || []).filter(t => t.service_type !== 'Entrada' && t.service_type !== 'Salida').length === 0 &&
            (entradaByDate[dateStr] || []).length === 0 &&
            (salidaByDate[dateStr] || []).length === 0 ? (
            <span className="text-gray-300 text-xs">Sin tareas</span>
          ) : null}
          <ul className="space-y-1">
            {(tasksByDate[dateStr] || []).filter(t => t.service_type !== 'Entrada' && t.service_type !== 'Salida').map(t => {
              let bg = "bg-blue-100 text-blue-800";
              if (t.service_type === "Retoque") bg = "bg-orange-200 text-orange-900";
              else if (t.service_type === "Limpieza") bg = "bg-blue-200 text-blue-900";
              return (
                <li key={t.id} className={`text-xs rounded px-1 py-0.5 mb-1 font-semibold ${bg}`}>
                  <span>{t.service_type}</span>
                  <span className="ml-1 text-gray-600 font-normal">({t.status})</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    );
  }

  // Navegación de meses
  function prevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  }
  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-indigo-700">Calendario de Tareas</h1>
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="px-3 py-1 rounded bg-indigo-200 hover:bg-indigo-300 text-indigo-800">&lt;</button>
        <div className="text-lg font-semibold text-white">{MONTHS[currentMonth]} {currentYear}</div>
        <button onClick={nextMonth} className="px-3 py-1 rounded bg-indigo-200 hover:bg-indigo-300 text-indigo-800">&gt;</button>
      </div>
      {loadingData ? (
        <p className="text-center">Cargando...</p>
      ) : (
        <div className="grid grid-cols-7 gap-2 bg-gray-100 p-2 rounded-lg">
          {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map(d => (
            <div key={d} className="text-center font-bold text-gray-600 mb-2">{d}</div>
          ))}
          {calendarCells}
        </div>
      )}
    </div>
  );
} 