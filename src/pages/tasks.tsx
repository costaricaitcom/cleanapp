import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { withRetry } from '../utils/withRetry';

export default function Tasks() {
  const auth = useAuth();
  const user = auth?.user;
  const role = auth?.role;
  const loading = auth?.loading;
  const router = useRouter();

  const [tasks, setTasks] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [form, setForm] = useState({
    property_id: "",
    service_type: "",
    scheduled_date: "",
    end_date: "",
    status: "pending",
    duration_days: "",
    notes: "",
    assigned_to: user ? [user.id] : []
  });
  const [error, setError] = useState("");
  const [cleaners, setCleaners] = useState<any[]>([]);
  const [cleaningManagers, setCleaningManagers] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState([
    {
      startDate: form.scheduled_date ? new Date(form.scheduled_date) : new Date(),
      endDate: form.end_date ? new Date(form.end_date) : new Date(),
      key: 'selection',
    },
  ]);

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
    // eslint-disable-next-line
  }, [user, role]);

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
      }, 10000, 3);
    } catch (err) {
      setError("Error al cargar tareas: " + (err.message || err));
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
      }, 10000, 3);
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
      }, 10000, 3);
    } catch (err) {
      setError("Error al cargar jefes de limpieza: " + (err.message || err));
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
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
            ...form,
            duration_days: Number(form.duration_days),
            assigned_to: assignedTo,
            owner_id: user.id
          }
        ]);
        if (error) throw new Error(error.message);
        setForm({
          property_id: "",
          service_type: "",
          scheduled_date: "",
          end_date: "",
          status: "pending",
          duration_days: "",
          notes: "",
          assigned_to: user ? [user.id] : []
        });
        fetchTasks();
      }, 10000, 3);
    } catch (err) {
      setError("Error al agregar tarea: " + (err.message || err));
    }
  }

  useEffect(() => {
    if (role === "owner") {
      console.log("cleaningManagers:", cleaningManagers);
    }
  }, [role, cleaningManagers]);

  if (loading) return <p className="text-center mt-8 text-lg">Cargando...</p>;
  if (error) return <p className="text-center mt-8 text-lg text-red-600">Error: {error}</p>;
  if (!user || (!['admin', 'cleaning_manager', 'cleaner', 'owner'].includes(role))) return null;

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-green-700">Gestión de Tareas de Limpieza</h1>
      {['admin', 'cleaning_manager', 'owner'].includes(role) && (
        <form onSubmit={handleAdd} className="w-full max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 bg-white/10 p-8 rounded-2xl shadow mb-8 justify-items-center items-center">
          <div className="flex flex-col w-full">
            <select className="input input-bordered p-2 rounded-2xl border w-full" value={form.service_type} onChange={e => setForm(f => ({ ...f, service_type: e.target.value }))} required>
              <option value="">Tipo de evento</option>
              <option value="Estadía">Estadía</option>
              <option value="Retoque">Retoque</option>
              <option value="Limpieza">Limpieza</option>
            </select>
          </div>
          <div className="flex flex-col w-full sm:col-span-2 lg:col-span-3 items-center gap-4">
            <label className="text-xs text-white mb-1 text-center">Selecciona el rango de fechas</label>
            <DateRange
              editableDateInputs={true}
              onChange={item => {
                setDateRange([item.selection]);
                setForm(f => ({
                  ...f,
                  scheduled_date: item.selection.startDate.toISOString().split('T')[0],
                  end_date: item.selection.endDate.toISOString().split('T')[0],
                }));
              }}
              moveRangeOnFirstSelection={false}
              ranges={dateRange}
              minDate={new Date()}
              rangeColors={["#2563eb"]}
              locale={undefined}
              className="date-range-dark"
            />
            <textarea
              className="input input-bordered p-2 rounded-2xl border w-full mt-4 bg-[#222] text-white"
              placeholder="Notas"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
            />
          </div>
          {/* Dropdowns for assignee, button, and error message remain as before, but centered and full width */}
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
                {cleaningManagers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name ? `${m.name} (${m.email})` : m.email}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex flex-col w-full sm:col-span-2 lg:col-span-3 items-center">
            <button type="submit" className="bg-green-600 text-white rounded-2xl px-6 py-2 hover:bg-green-700 transition w-full max-w-xs">Agregar Tarea</button>
            {error && <span className="text-red-600 mt-2 text-center w-full">{error}</span>}
          </div>
        </form>
      )}
      <h2 className="text-xl font-semibold mb-4">Lista de Tareas</h2>
      {loadingData ? <p className="text-center">Cargando...</p> : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-2xl shadow">
            <thead>
              <tr className="bg-gradient-to-r from-[#23232a] to-[#233a2d] text-white font-bold rounded-t-2xl shadow border-l-4 border-green-600">
                <th className="py-2 px-3">ID</th>
                <th className="py-2 px-3">Propiedad</th>
                <th className="py-2 px-3 flex items-center gap-1">🧹 <span>Tipo</span></th>
                <th className="py-2 px-3">Fecha inicio</th>
                <th className="py-2 px-3">Fecha fin</th>
                <th className="py-2 px-3">Estado</th>
                <th className="py-2 px-3">Duración</th>
                <th className="py-2 px-3">Notas</th>
                <th className="py-2 px-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id} className="border-b hover:bg-green-900/30 transition-all duration-200">
                  <td className="py-2 px-3 text-xs break-all">{t.id}</td>
                  <td className="py-2 px-3">{t.property_id}</td>
                  <td className="py-2 px-3">{t.service_type}</td>
                  <td className="py-2 px-3">{t.scheduled_date}</td>
                  <td className="py-2 px-3">{t.end_date}</td>
                  <td className="py-2 px-3">{t.status}</td>
                  <td className="py-2 px-3">{t.duration_days}</td>
                  <td className="py-2 px-3">{t.notes}</td>
                  <td className="py-2 px-3">
                    {/* Placeholder for edit/delete */}
                    <button className="bg-gray-300 text-gray-700 rounded-2xl px-2 py-1 mr-2" disabled>Editar</button>
                    <button className="bg-red-400 text-white rounded-2xl px-2 py-1" disabled>Eliminar</button>
                    {/* Photo upload for cleaner */}
                    {role === "cleaner" && (
                      <TaskPhotoUpload taskId={t.id} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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