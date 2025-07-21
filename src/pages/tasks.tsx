import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import CustomDateRange from "../components/CustomDateRange";
import LoadingSpinner from "../components/LoadingSpinner";
import Notification from "../components/Notification";
import ConfirmDialog from "../components/ConfirmDialog";
import SearchInput from "../components/SearchInput";
import Pagination from "../components/Pagination";
import Tooltip from "../components/Tooltip";
import { withRetry } from '../utils/withRetry';
import { generateUUID } from '../utils/uuid';
import { TaskForm, taskInitialState } from '../schema/task';

export default function Tasks() {
  const auth = useAuth();
  const user = auth?.user;
  const role = auth?.role;
  const loading = auth?.loading;
  const router = useRouter();

  const [tasks, setTasks] = useState<any[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [form, setForm] = useState<TaskForm>({ ...taskInitialState, assigned_to: user ? [user.id] : [] });
  const [error, setError] = useState("");
  const [cleaners, setCleaners] = useState<any[]>([]);
  const [cleaningManagers, setCleaningManagers] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(),
    endDate: new Date()
  });

  // New state for enhanced functionality
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
  }>({ show: false, type: 'info', message: '' });

  useEffect(() => {
    if (!loading && (!user || !['admin', 'cleaning_manager', 'cleaner', 'owner'].includes(role))) {
      router.push("/dashboard");
    }
  }, [user, role, loading, router]);

  useEffect(() => {
    if (user && (role === "admin" || role === "cleaning_manager" || role === "owner")) {
      fetchTasks();
    }
    if (role === "cleaning_manager") {
      fetchCleaners();
    }
    if (role === "admin" || role === "cleaning_manager" || role === "owner") {
      fetchCleaningManagers();
    }
    if (role === "admin" || role === "cleaning_manager" || role === "owner") {
      fetchProperties();
    }
    // eslint-disable-next-line
  }, [user, role]);

  // Filter tasks based on search term
  useEffect(() => {
    const filtered = tasks.filter(task => 
      task.service_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.status?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredTasks(filtered);
    setCurrentPage(1);
  }, [tasks, searchTerm]);

  const showNotification = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    setNotification({ show: true, type, message });
  };

  async function fetchTasks() {
    setLoadingData(true);
    setError("");
    try {
      await withRetry(async () => {
        let query = supabase.from("cleaning_tasks").select("*");
        if (role === "cleaner") {
          // Only show tasks assigned to this user
          query = query.contains("assigned_to", [user.id]);
        }
        const { data, error } = await query;
        if (error) throw new Error(error.message);
        setTasks(data || []);
      }, 5000, 3);
    } catch (err) {
      setError("Error al cargar tareas: " + (err.message || err));
      showNotification('error', 'Error al cargar tareas');
    } finally {
      setLoadingData(false);
    }
  }

  async function fetchCleaners() {
    try {
      await withRetry(async () => {
        const { data, error } = await supabase.from("users").select("id, name, email").eq("role", "cleaner");
        if (error) throw new Error(error.message);
        setCleaners(data || []);
      }, 5000, 3);
    } catch (err) {
      setError("Error al cargar limpiadores: " + (err.message || err));
    }
  }

  async function fetchCleaningManagers() {
    try {
      await withRetry(async () => {
        const { data, error } = await supabase.from("users").select("id, name, email").eq("role", "cleaning_manager");
        if (error) throw new Error(error.message);
        setCleaningManagers(data || []);
      }, 5000, 3);
    } catch (err) {
      setError("Error al cargar jefes de limpieza: " + (err.message || err));
    }
  }

  async function fetchProperties() {
    try {
      await withRetry(async () => {
        let query = supabase.from("properties").select("*");
        if (role === "owner") {
          query = query.eq("owner_id", user.id);
        }
        const { data, error } = await query;
        if (error) throw new Error(error.message);
        setProperties(data || []);
      }, 5000, 3);
    } catch (err) {
      setError("Error al cargar propiedades: " + (err.message || err));
    }
  }

  // Get property address by ID
  const getPropertyAddress = (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId);
    return property ? `${property.location}, ${property.province}` : propertyId;
  };

  // Format UUID to show only first 8 characters
  const formatUUID = (uuid: string) => {
    return uuid ? uuid.substring(0, 8) : '';
  };

  // Translate status to Spanish
  const translateStatus = (status: string) => {
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
        return status;
    }
  };

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    
    // Validate required fields
    if (!form.property_id) {
      setError("Debe seleccionar una propiedad.");
      return;
    }
    if (!form.service_type) {
      setError("Debe seleccionar un tipo de servicio.");
      return;
    }
    if (!form.scheduled_date || !form.end_date) {
      setError("Debe seleccionar las fechas de inicio y fin.");
      return;
    }
    
    let assignedTo = form.assigned_to;
    if (role === "cleaning_manager") {
      if (!assignedTo || assignedTo.length === 0) {
        setError("Debe seleccionar un Limpiador para asignar la tarea.");
        return;
      }
    } else if (role === "owner") {
      if (!assignedTo || assignedTo.length === 0) {
        setError("Debe seleccionar un Jefe de Limpieza para asignar la tarea.");
        return;
      }
    } else if (role === "cleaner") {
      assignedTo = [user.id];
    }
    try {
      await withRetry(async () => {
        const { data, error } = await supabase.from("cleaning_tasks").insert([
          {
            id: generateUUID(),
            ...form,
            duration_days: Number(form.duration_days),
            assigned_to: assignedTo,
            owner_id: user.id
          }
        ]);
        if (error) throw new Error(error.message);
        setForm({ ...taskInitialState, assigned_to: user ? [user.id] : [] });
        fetchTasks();
        showNotification('success', 'Tarea agregada exitosamente');
      }, 5000, 3);
    } catch (err) {
      setError("Error al agregar tarea: " + (err.message || err));
      showNotification('error', 'Error al agregar tarea');
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      await withRetry(async () => {
        const { error } = await supabase.from("cleaning_tasks").delete().eq("id", taskId);
        if (error) throw new Error(error.message);
        fetchTasks();
        showNotification('success', 'Tarea eliminada exitosamente');
      }, 5000, 3);
    } catch (err) {
      showNotification('error', 'Error al eliminar tarea');
    }
    setShowConfirmDelete(false);
    setTaskToDelete(null);
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTasks = filteredTasks.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);

  useEffect(() => {
    if (role === "owner" || role === "admin" || role === "cleaning_manager") {
      console.log("cleaningManagers:", cleaningManagers);
    }
  }, [role, cleaningManagers]);

  if (loading) return <LoadingSpinner size="lg" text="Cargando aplicación..." />;
  if (error) return (
    <div className="text-center mt-8 text-lg text-red-600">
      Error: {error}
      <br />
      <button className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-2xl" onClick={fetchTasks}>
        Reintentar
      </button>
    </div>
  );
  if (!user || (!['admin', 'cleaning_manager', 'cleaner', 'owner'].includes(role))) return null;

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-green-700">Gestión de Tareas de Limpieza</h1>
      
      {['admin', 'cleaning_manager', 'owner'].includes(role) && (
        <form onSubmit={handleAdd} className="w-full max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 bg-white/10 p-8 rounded-2xl shadow mb-8 justify-items-center items-center">
          <div className="flex flex-col w-full">
            <Tooltip content="Selecciona el tipo de servicio de limpieza">
              <select className="input input-bordered p-2 rounded-2xl border w-full" value={form.service_type} onChange={e => setForm(f => ({ ...f, service_type: e.target.value }))} required>
                <option value="">Tipo de evento</option>
                <option value="Estadía">Estadía</option>
                <option value="Retoque">Retoque</option>
                <option value="Limpieza">Limpieza</option>
              </select>
            </Tooltip>
          </div>
          <div className="flex flex-col w-full">
            <Tooltip content="Selecciona la propiedad para la tarea">
              <select className="input input-bordered p-2 rounded-2xl border w-full" value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))} required>
                <option value="">Seleccionar Propiedad</option>
                {properties.map(property => (
                  <option key={property.id} value={property.id}>
                    {property.location} - {property.province}
                  </option>
                ))}
              </select>
            </Tooltip>
          </div>
          <div className="flex flex-col w-full sm:col-span-2 lg:col-span-3 items-center gap-4">
            <label className="text-xs text-white mb-1 text-center">Selecciona el rango de fechas</label>
            <CustomDateRange
              value={dateRange}
              onChange={(range) => {
                setDateRange(range);
                const startDate = range.startDate;
                const endDate = range.endDate;
                const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                setForm(f => ({
                  ...f,
                  scheduled_date: startDate.toISOString().split('T')[0],
                  end_date: endDate.toISOString().split('T')[0],
                  duration_days: diffDays.toString()
                }));
              }}
              minDate={new Date()}
            />
            <textarea
              className="input input-bordered p-2 rounded-2xl border w-full mt-4 bg-[#222] text-white"
              placeholder="Notas"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
            />
          </div>
          
          {role === "cleaning_manager" && (
            <div className="flex flex-col w-full sm:col-span-2 lg:col-span-3">
              <select
                className="input input-bordered p-2 rounded-2xl border w-full"
                value={form.assigned_to && form.assigned_to[0] ? form.assigned_to[0] : ""}
                onChange={e => setForm(f => ({ ...f, assigned_to: [e.target.value] }))}
                required
              >
                <option value="">Asignar a Limpiador</option>
                {cleaners.map(c => (
                  <option key={c.id} value={c.id}>{c.name || c.email}</option>
                ))}
              </select>
            </div>
          )}
          
          {role === "owner" && (
            <div className="flex flex-col w-full">
              <label className="text-xs text-white mb-1 text-center">Asignar a Jefe de Limpieza</label>
              <select
                className="input input-bordered p-2 rounded-2xl border w-full bg-[#222] text-white"
                value={form.assigned_to[0] || ""}
                onChange={e => setForm(f => ({ ...f, assigned_to: [e.target.value] }))}
                required
              >
                <option value="">Selecciona un Jefe de Limpieza</option>
                {cleaningManagers.length === 0 && <option disabled value="">No hay jefes de limpieza disponibles</option>}
                {cleaningManagers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name ? `${m.name} (${m.email})` : m.email}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <div className="flex flex-col w-full sm:col-span-2 lg:col-span-3 items-center">
            <button type="submit" className="bg-green-600 text-white rounded-2xl px-6 py-2 hover:bg-green-700 transition w-full max-w-xs">
              Agregar Tarea
            </button>
            {error && <span className="text-red-600 mt-2 text-center w-full">{error}</span>}
          </div>
        </form>
      )}

      {/* Search and Filters */}
      <div className="mb-6">
        <SearchInput
          placeholder="Buscar tareas por tipo, notas o estado..."
          value={searchTerm}
          onChange={setSearchTerm}
          className="max-w-md"
        />
      </div>

      <h2 className="text-xl font-semibold mb-4">Lista de Tareas</h2>
      
      {loadingData ? (
        <LoadingSpinner text="Cargando tareas..." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-2xl shadow">
              <thead>
                <tr className="bg-gradient-to-r from-[#23232a] to-[#233a2d] text-white font-bold rounded-t-2xl shadow border-l-4 border-green-600">
                  <th className="py-2 px-3">Propiedad</th>
                  <th className="py-2 px-3">Tipo</th>
                  <th className="py-2 px-3">Fecha inicio</th>
                  <th className="py-2 px-3">Fecha fin</th>
                  <th className="py-2 px-3">Estado</th>
                  <th className="py-2 px-3">Duración</th>
                  <th className="py-2 px-3">Notas</th>
                  <th className="py-2 px-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {currentTasks.map((t) => (
                  <tr key={t.id} className="border-b hover:bg-green-900/30 transition-all duration-200">
                    <td className="py-2 px-3">{getPropertyAddress(t.property_id)}</td>
                    <td className="py-2 px-3">{t.service_type}</td>
                    <td className="py-2 px-3">{t.scheduled_date}</td>
                    <td className="py-2 px-3">{t.end_date}</td>
                    <td className="py-2 px-3">{translateStatus(t.status)}</td>
                    <td className="py-2 px-3">{t.duration_days}</td>
                    <td className="py-2 px-3">{t.notes}</td>
                    <td className="py-2 px-3">
                      <div className="flex space-x-2">
                        <Tooltip content="Editar tarea">
                          <button className="bg-gray-300 text-gray-700 rounded-2xl px-2 py-1" disabled>
                            Editar
                          </button>
                        </Tooltip>
                        <Tooltip content="Eliminar tarea">
                          <button 
                            className="bg-red-400 text-white rounded-2xl px-2 py-1"
                            onClick={() => {
                              setTaskToDelete(t.id);
                              setShowConfirmDelete(true);
                            }}
                          >
                            Eliminar
                          </button>
                        </Tooltip>
                        {/* Photo upload for cleaner */}
                        {role === "cleaner" && (
                          <TaskPhotoUpload taskId={t.id} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="mt-6">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        </>
      )}

      {/* Notification */}
      <Notification
        show={notification.show}
        type={notification.type}
        message={notification.message}
        onClose={() => setNotification({ ...notification, show: false })}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDelete}
        title="Eliminar Tarea"
        message="¿Estás seguro de que quieres eliminar esta tarea? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={() => taskToDelete && handleDeleteTask(taskToDelete)}
        onCancel={() => setShowConfirmDelete(false)}
        type="danger"
      />
    </div>
  );
}

function TaskPhotoUpload({ taskId }) {
  const [photos, setPhotos] = React.useState<{ name: string }[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    fetchPhotos();
  }, [taskId]);

  async function fetchPhotos() {
    // List files from Supabase storage bucket 'task-photos/{taskId}/'
    const { data, error } = await supabase.storage.from('task-photos').list(`${taskId}/`);
    if (!error && data) {
      setPhotos(data.filter((f: { name: string }) => f.name.match(/\.(jpg|jpeg|png|webp)$/i)));
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length + photos.length > 6) {
      alert('Máximo 6 fotos por tarea.');
      return;
    }
    setUploading(true);
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Cada foto debe ser menor a 5MB.');
        continue;
      }
      const ext = file.name.split('.').pop();
      const filePath = `${taskId}/${Date.now()}-${Math.random().toString(36).substr(2, 6)}.${ext}`;
      const { error } = await supabase.storage.from('task-photos').upload(filePath, file);
      if (error) alert('Error subiendo foto: ' + error.message);
    }
    setUploading(false);
    fetchPhotos();
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function getPublicUrl(path: string) {
    const { data } = supabase.storage.from('task-photos').getPublicUrl(path);
    return data.publicUrl;
  }

  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-2 mb-2">
        {photos.map((photo) => (
          <img key={photo.name} src={getPublicUrl(`${taskId}/${photo.name}`)} alt="Foto tarea" className="w-16 h-16 object-cover rounded" />
        ))}
      </div>
      {photos.length < 6 && (
        <input
          type="file"
          accept="image/*"
          multiple
          ref={fileInputRef}
          onChange={handleUpload}
          disabled={uploading}
          className="block text-xs"
        />
      )}
      {uploading && <span className="text-xs text-gray-500">Subiendo...</span>}
    </div>
  );
} 