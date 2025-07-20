import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import LoadingSpinner from "../components/LoadingSpinner";
import Tooltip from "../components/Tooltip";

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

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export default function Calendar() {
  const auth = useAuth();
  const user = auth?.user;
  const loading = auth?.loading;
  const router = useRouter();

  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [tasks, setTasks] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchTasks();
      fetchProperties();
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

  async function fetchProperties() {
    const { data, error } = await supabase
      .from("properties")
      .select("*");
    if (!error) setProperties(data || []);
  }

  if (loading) return <LoadingSpinner size="lg" text="Cargando aplicación..." />;
  if (!user) return null;

  // Agrupar tareas por fecha para mostrar en todos los días del rango
  const tasksByDate: Record<string, any[]> = {};
  
  tasks.forEach(t => {
    if (t.scheduled_date && t.end_date) {
      const startDate = new Date(t.scheduled_date);
      const endDate = new Date(t.end_date);
      
      // Iterar por todos los días del rango de la tarea
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = formatDate(d);
        if (!tasksByDate[dateStr]) {
          tasksByDate[dateStr] = [];
        }
        tasksByDate[dateStr].push(t);
      }
    } else if (t.scheduled_date) {
      // Si solo hay fecha de inicio, mostrar solo en ese día
      const dateStr = t.scheduled_date;
      if (!tasksByDate[dateStr]) {
        tasksByDate[dateStr] = [];
      }
      tasksByDate[dateStr].push(t);
    }
  });

  const getTaskIndicatorStyle = (taskType: string, status: string, isStartDate: boolean, isEndDate: boolean) => {
    let baseClasses = "text-xs rounded px-2 py-1 mb-1 font-semibold transition-all duration-200 cursor-pointer";
    
    // Different styles for start, middle, and end dates
    if (isStartDate) {
      baseClasses += " border-l-4 border-l-green-400 ";
    } else if (isEndDate) {
      baseClasses += " border-r-4 border-r-red-400 ";
    } else {
      baseClasses += " border-l-2 border-l-gray-400 border-r-2 border-r-gray-400 ";
    }
    
    switch (taskType) {
      case 'Estadía':
        return `${baseClasses} bg-green-600 text-white shadow-sm hover:bg-green-700`;
      case 'Retoque':
        return `${baseClasses} bg-orange-600 text-white shadow-sm hover:bg-orange-700`;
      case 'Limpieza':
        return `${baseClasses} bg-blue-600 text-white shadow-sm hover:bg-blue-700`;
      default:
        return `${baseClasses} bg-gray-600 text-white shadow-sm hover:bg-gray-700`;
    }
  };

  const getTaskDisplayText = (task: any, dateStr: string) => {
    const isStartDate = task.scheduled_date === dateStr;
    const isEndDate = task.end_date === dateStr;
    
    if (isStartDate && isEndDate) {
      return `${task.service_type} (1 día)`;
    } else if (isStartDate) {
      return `Inicio: ${task.service_type}`;
    } else if (isEndDate) {
      return `Fin: ${task.service_type}`;
    } else {
      return `${task.service_type}`;
    }
  };

  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'pending':
        return 'P';
      case 'in_progress':
        return 'E';
      case 'completed':
        return 'C';
      case 'cancelled':
        return 'X';
      default:
        return '?';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'in_progress':
        return 'En Progreso';
      case 'completed':
        return 'Completada';
      case 'cancelled':
        return 'Cancelada';
      default:
        return 'Desconocido';
    }
  };

  const getPropertyAddress = (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId);
    return property ? `${property.location}, ${property.province}` : propertyId;
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOfWeek = getFirstDayOfWeek(currentYear, currentMonth);

  // Construir celdas del calendario
  const calendarCells = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarCells.push(<div key={"empty-" + i} className="bg-gray-800/50 rounded-lg border border-gray-700 min-h-[100px]"></div>);
  }
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDate(new Date(currentYear, currentMonth, day));
    const isToday = dateStr === formatDate(today);
    const dayTasks = tasksByDate[dateStr] || [];
    const hasTasks = dayTasks.length > 0;
    
    calendarCells.push(
      <div 
        key={dateStr} 
        className={`border border-gray-700 rounded-lg p-2 min-h-[100px] bg-gray-900/80 flex flex-col transition-all duration-200 hover:bg-gray-800/90 hover:border-gray-600 ${
          isToday ? 'ring-2 ring-purple-500 bg-purple-900/20' : ''
        } ${hasTasks ? 'border-l-4 border-l-green-500' : ''}`}
      >
        <div className={`font-bold text-sm mb-2 flex items-center justify-between ${
          isToday ? 'text-purple-300' : 'text-gray-300'
        }`}>
          <span className={`${isToday ? 'bg-purple-600 rounded-full w-6 h-6 flex items-center justify-center' : ''}`}>
            {day}
          </span>
          {hasTasks && (
            <span className="text-xs bg-green-600 text-white px-1 rounded-full">
              {dayTasks.length}
            </span>
          )}
        </div>
        
        <div className="flex-1 space-y-1">
          {dayTasks.length === 0 ? (
            <span className="text-gray-500 text-xs italic">Sin tareas</span>
          ) : (
            dayTasks.map(t => {
              const taskInstanceId = `${t.id}-${dateStr}`;
              return (
                <div
                  key={taskInstanceId}
                  className={getTaskIndicatorStyle(t.service_type, t.status, t.scheduled_date === dateStr, t.end_date === dateStr)}
                  onMouseEnter={() => setHoveredTask(taskInstanceId)}
                  onMouseLeave={() => setHoveredTask(null)}
                  onClick={() => setSelectedTask(t)}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate font-medium">{getTaskDisplayText(t, dateStr)}</span>
                    <span className="ml-1">{getStatusIndicator(t.status)}</span>
                  </div>
                  {hoveredTask === taskInstanceId && (
                    <div className="absolute z-50 bg-gray-800 text-white p-2 rounded shadow-lg text-xs mt-1 max-w-xs border border-gray-600">
                      <div><strong>Propiedad:</strong> {getPropertyAddress(t.property_id)}</div>
                      <div><strong>Estado:</strong> {getStatusText(t.status)}</div>
                      {t.notes && <div><strong>Notas:</strong> {t.notes}</div>}
                    </div>
                  )}
                </div>
              );
            })
          )}
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

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;

  return (
    <div className="max-w-7xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-indigo-700">Calendario de Tareas</h1>
      
      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 rounded-lg text-white">
          <div className="text-2xl font-bold">{totalTasks}</div>
          <div className="text-sm opacity-90">Total de Tareas</div>
        </div>
        <div className="bg-gradient-to-r from-green-600 to-green-700 p-4 rounded-lg text-white">
          <div className="text-2xl font-bold">{completedTasks}</div>
          <div className="text-sm opacity-90">Completadas</div>
        </div>
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-4 rounded-lg text-white">
          <div className="text-2xl font-bold">{pendingTasks}</div>
          <div className="text-sm opacity-90">Pendientes</div>
        </div>
        <div className="bg-gradient-to-r from-yellow-600 to-yellow-700 p-4 rounded-lg text-white">
          <div className="text-2xl font-bold">{inProgressTasks}</div>
          <div className="text-sm opacity-90">En Progreso</div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={prevMonth} 
          className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors flex items-center gap-2"
        >
          Mes Anterior
        </button>
        <div className="text-xl font-semibold text-white bg-gray-800 px-6 py-2 rounded-lg">
          {MONTHS[currentMonth]} {currentYear}
        </div>
        <button 
          onClick={nextMonth} 
          className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors flex items-center gap-2"
        >
          Mes Siguiente
        </button>
      </div>

      <div className="flex gap-6">
        {/* Calendar Section - 2/3 width */}
        <div className="flex-1">
          {loadingData ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner text="Cargando calendario..." />
            </div>
          ) : (
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              {/* Week days header */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {WEEKDAYS.map(d => (
                  <div key={d} className="text-center font-bold text-gray-300 py-2">
                    {d}
                  </div>
                ))}
              </div>
              
              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-2">
                {calendarCells}
              </div>
            </div>
          )}
        </div>

        {/* Task Details Section - 1/3 width */}
        <div className="w-1/3">
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 sticky top-4">
            <h2 className="text-xl font-semibold text-white mb-4">Detalles de Tarea</h2>
            {selectedTask ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-white mb-2">{selectedTask.service_type}</h3>
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="text-gray-400">Propiedad:</span>
                        <div className="text-white font-medium">{getPropertyAddress(selectedTask.property_id)}</div>
                      </div>
                      <div>
                        <span className="text-gray-400">Estado:</span>
                        <div className="text-white font-medium">{getStatusText(selectedTask.status)}</div>
                      </div>
                      <div>
                        <span className="text-gray-400">Fecha de Inicio:</span>
                        <div className="text-white font-medium">{selectedTask.scheduled_date}</div>
                      </div>
                      <div>
                        <span className="text-gray-400">Fecha de Fin:</span>
                        <div className="text-white font-medium">{selectedTask.end_date}</div>
                      </div>
                      <div>
                        <span className="text-gray-400">Duración:</span>
                        <div className="text-white font-medium">{selectedTask.duration_days} días</div>
                      </div>
                      {selectedTask.notes && (
                        <div>
                          <span className="text-gray-400">Notas:</span>
                          <div className="text-white font-medium">{selectedTask.notes}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedTask(null)}
                  className="w-full bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cerrar Detalles
                </button>
              </div>
            ) : (
              <div className="text-gray-400 text-center py-8">
                Haz clic en una tarea del calendario para ver sus detalles
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 