import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { withRetry } from '../utils/withRetry';
import { generateUUID } from '../utils/uuid';

export default function Finances() {
  const auth = useAuth();
  const user = auth?.user;
  const role = auth?.role;
  const loading = auth?.loading;
  const router = useRouter();

  const [revenues, setRevenues] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [servicePrices, setServicePrices] = useState({
    Estadía: "",
    Retoque: "",
    Limpieza: ""
  });
  const [loadingData, setLoadingData] = useState(true);
  const [form, setForm] = useState({
    type: "revenue",
    owner_id: "",
    property_id: "",
    amount: "",
    description: "",
    date: ""
  });
  const [filters, setFilters] = useState({
    owner_id: "",
    property_id: "",
    date_from: "",
    date_to: ""
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && (!user || (role !== "admin" && role !== "finance"))) {
      router.push("/dashboard");
    }
  }, [user, role, loading, router]);

  useEffect(() => {
    if (user && (role === "admin" || role === "finance")) {
      fetchData();
    }
    // eslint-disable-next-line
  }, [user, role]);

  useEffect(() => {
    setFilteredProperties(properties);
  }, [properties]);

  async function fetchData() {
    setLoadingData(true);
    setError("");
    try {
      await withRetry(async () => {
        // Fetch owners
        const { data: ownersData, error: ownersErr } = await supabase
          .from("users")
          .select("id, email, name")
          .eq("role", "owner");
        if (ownersErr) throw new Error(ownersErr.message);
        setOwners(ownersData || []);

        // Fetch all properties
        const { data: propertiesData, error: propertiesErr } = await supabase
          .from("properties")
          .select("*");
        if (propertiesErr) throw new Error(propertiesErr.message);
        setProperties(propertiesData || []);

        // Fetch financial data with filters
        let revenuesQuery = supabase.from("revenues").select("*");
        let expensesQuery = supabase.from("expenses").select("*");

        if (filters.owner_id) {
          revenuesQuery = revenuesQuery.eq("owner_id", filters.owner_id);
          expensesQuery = expensesQuery.eq("owner_id", filters.owner_id);
        }
        if (filters.property_id) {
          revenuesQuery = revenuesQuery.eq("property_id", filters.property_id);
          expensesQuery = expensesQuery.eq("property_id", filters.property_id);
        }
        if (filters.date_from) {
          revenuesQuery = revenuesQuery.gte("date", filters.date_from);
          expensesQuery = expensesQuery.gte("date", filters.date_from);
        }
        if (filters.date_to) {
          revenuesQuery = revenuesQuery.lte("date", filters.date_to);
          expensesQuery = expensesQuery.lte("date", filters.date_to);
        }

        const { data: revs, error: revErr } = await revenuesQuery;
        const { data: exps, error: expErr } = await expensesQuery;
        
        if (revErr) throw new Error(revErr.message);
        if (expErr) throw new Error(expErr.message);
        setRevenues(revs || []);
        setExpenses(exps || []);

        // Fetch all tasks with property and owner information
        const { data: tasksData, error: tasksErr } = await supabase
          .from("cleaning_tasks")
          .select(`
            *,
            properties!inner(
              id,
              location,
              province,
              owner_id
            )
          `);
        if (tasksErr) throw new Error(tasksErr.message);
        
        // Transform the data to include owner_id
        const transformedTasks = (tasksData || []).map(task => ({
          ...task,
          owner_id: task.properties?.owner_id
        }));
        setTasks(transformedTasks);

        // Fetch service prices (from a new table or use existing mechanism)
        // For now, we'll use localStorage or create a simple pricing system
        const savedPrices = localStorage.getItem('servicePrices');
        if (savedPrices) {
          setServicePrices(JSON.parse(savedPrices));
        }
      }, 10000, 3);
    } catch (err) {
      setError("Error al cargar finanzas: " + (err.message || err));
    } finally {
      setLoadingData(false);
    }
  }

  // Handle owner selection and filter properties
  const handleOwnerChange = (ownerId: string) => {
    setForm(prev => ({ ...prev, owner_id: ownerId, property_id: "" }));
    if (ownerId) {
      const ownerProperties = properties.filter(p => p.owner_id === ownerId);
      setFilteredProperties(ownerProperties);
    } else {
      setFilteredProperties(properties);
    }
  };

  // Handle filter changes
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Handle service price updates
  const handleServicePriceChange = (serviceType: string, price: string) => {
    const newPrices = { ...servicePrices, [serviceType]: price };
    setServicePrices(newPrices);
    localStorage.setItem('servicePrices', JSON.stringify(newPrices));
  };

  // Get property address by ID
  const getPropertyAddress = (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId);
    return property ? `${property.location}, ${property.province}` : propertyId;
  };

  // Get owner name by ID
  const getOwnerName = (ownerId: string) => {
    const owner = owners.find(o => o.id === ownerId);
    return owner ? (owner.name || owner.email) : ownerId;
  };

  // Calculate task cost based on service type and duration
  const calculateTaskCost = (task: any) => {
    const price = servicePrices[task.service_type];
    if (!price) return 0;
    
    // For Estadía, only count start and end dates (2 days total)
    if (task.service_type === 'Estadía') {
      return Number(price) * 2;
    }
    
    // For other services, count all days
    return Number(price) * Number(task.duration_days || 0);
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
    try {
      await withRetry(async () => {
        if (form.type === "revenue") {
          const { error } = await supabase.from("revenues").insert([
            {
              id: generateUUID(),
              property_id: form.property_id,
              amount: Number(form.amount),
              description: form.description,
              date: form.date,
              recorded_by: user.id,
              owner_id: form.owner_id
            }
          ]);
          if (error) throw new Error(error.message);
          fetchData();
        } else {
          const { error } = await supabase.from("expenses").insert([
            {
              id: generateUUID(),
              property_id: form.property_id,
              amount: Number(form.amount),
              description: form.description,
              type: "General",
              date: form.date,
              recorded_by: user.id,
              owner_id: form.owner_id
            }
          ]);
          if (error) throw new Error(error.message);
          fetchData();
        }
      }, 10000, 3);
      setForm({ type: "revenue", owner_id: "", property_id: "", amount: "", description: "", date: "" });
    } catch (err) {
      setError("Error al agregar registro financiero: " + (err.message || err));
    }
  }

  if (loading) return <p className="text-center mt-8 text-lg">Cargando...</p>;
  if (error) return <div className="text-center mt-8 text-lg text-red-600">Error: {error}<br /><button className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-2xl" onClick={fetchData}>Reintentar</button></div>;
  if (!user || (role !== "admin" && role !== "finance")) return null;

  return (
    <div className="max-w-7xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-purple-700">Gestión Financiera</h1>
      
      {/* Filters Section */}
      <div className="bg-white p-6 rounded-2xl shadow mb-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select 
            className="input input-bordered p-2 rounded border" 
            value={filters.owner_id} 
            onChange={e => handleFilterChange('owner_id', e.target.value)}
          >
            <option value="">Todos los Propietarios</option>
            {owners.map(owner => (
              <option key={owner.id} value={owner.id}>
                {owner.name || owner.email}
              </option>
            ))}
          </select>
          <select 
            className="input input-bordered p-2 rounded border" 
            value={filters.property_id} 
            onChange={e => handleFilterChange('property_id', e.target.value)}
          >
            <option value="">Todas las Propiedades</option>
            {properties.map(property => (
              <option key={property.id} value={property.id}>
                {getPropertyAddress(property.id)}
              </option>
            ))}
          </select>
          <input 
            className="input input-bordered p-2 rounded border" 
            type="date" 
            placeholder="Fecha Desde"
            value={filters.date_from} 
            onChange={e => handleFilterChange('date_from', e.target.value)}
          />
          <input 
            className="input input-bordered p-2 rounded border" 
            type="date" 
            placeholder="Fecha Hasta"
            value={filters.date_to} 
            onChange={e => handleFilterChange('date_to', e.target.value)}
          />
        </div>
        <div className="mt-4 flex gap-2">
          <button 
            type="button" 
            onClick={fetchData}
            className="bg-blue-600 text-white rounded-2xl px-4 py-2 hover:bg-blue-700 transition"
          >
            Aplicar Filtros
          </button>
          <button 
            type="button" 
            onClick={() => {
              setFilters({ owner_id: "", property_id: "", date_from: "", date_to: "" });
              fetchData();
            }}
            className="bg-gray-600 text-white rounded-2xl px-4 py-2 hover:bg-gray-700 transition"
          >
            Limpiar Filtros
          </button>
        </div>
      </div>

      {/* Add Form */}
      <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-6 gap-4 bg-white p-6 rounded-2xl shadow mb-8">
        <select className="input input-bordered p-2 rounded border" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
          <option value="revenue">Ingreso</option>
          <option value="expense">Gasto</option>
        </select>
        <select 
          className="input input-bordered p-2 rounded border" 
          value={form.owner_id} 
          onChange={e => handleOwnerChange(e.target.value)}
          required
        >
          <option value="">Seleccionar Propietario</option>
          {owners.map(owner => (
            <option key={owner.id} value={owner.id}>
              {owner.name || owner.email}
            </option>
          ))}
        </select>
        <select 
          className="input input-bordered p-2 rounded border" 
          value={form.property_id} 
          onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))} 
          required
          disabled={!form.owner_id}
        >
          <option value="">Seleccionar Propiedad</option>
          {filteredProperties.map(property => (
            <option key={property.id} value={property.id}>
              {getPropertyAddress(property.id)}
            </option>
          ))}
        </select>
        <input className="input input-bordered p-2 rounded border" placeholder="Monto" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
        <input className="input input-bordered p-2 rounded border" placeholder="Descripción" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        <input className="input input-bordered p-2 rounded border" placeholder="Fecha" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
        <button type="submit" className="bg-purple-600 text-white rounded-2xl px-4 py-2 hover:bg-purple-700 transition col-span-full md:col-span-1">Agregar</button>
        {error && <span className="text-red-600 col-span-full">{error}</span>}
      </form>

      {/* Dashboard Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 rounded-2xl text-white">
          <div className="text-2xl font-bold">
            ₡{revenues.reduce((sum, r) => sum + Number(r.amount), 0).toLocaleString()}
          </div>
          <div className="text-sm opacity-90">Total Ingresos</div>
        </div>
        <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 rounded-2xl text-white">
          <div className="text-2xl font-bold">
            ₡{expenses.reduce((sum, e) => sum + Number(e.amount), 0).toLocaleString()}
          </div>
          <div className="text-sm opacity-90">Total Gastos</div>
        </div>
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-2xl text-white">
          <div className="text-2xl font-bold">
            ₡{(revenues.reduce((sum, r) => sum + Number(r.amount), 0) - expenses.reduce((sum, e) => sum + Number(e.amount), 0)).toLocaleString()}
          </div>
          <div className="text-sm opacity-90">Beneficio Neto</div>
        </div>
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 rounded-2xl text-white">
          <div className="text-2xl font-bold">
            {revenues.length + expenses.length}
          </div>
          <div className="text-sm opacity-90">Total Registros</div>
        </div>
      </div>

      {/* Service Pricing Section */}
      <div className="bg-white p-6 rounded-2xl shadow mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Precios de Servicios</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Estadía (por día)</label>
            <input
              type="number"
              className="w-full p-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
              placeholder="0.00"
              value={servicePrices.Estadía}
              onChange={e => handleServicePriceChange('Estadía', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Retoque (por día)</label>
            <input
              type="number"
              className="w-full p-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
              placeholder="0.00"
              value={servicePrices.Retoque}
              onChange={e => handleServicePriceChange('Retoque', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Limpieza (por día)</label>
            <input
              type="number"
              className="w-full p-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
              placeholder="0.00"
              value={servicePrices.Limpieza}
              onChange={e => handleServicePriceChange('Limpieza', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-white p-6 rounded-2xl shadow mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Tareas de Limpieza</h2>
        {loadingData ? <p className="text-center">Cargando...</p> : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-2xl shadow">
              <thead>
                <tr className="bg-gradient-to-r from-[#23232a] to-[#3a2340] text-white font-bold rounded-t-2xl shadow border-l-4 border-purple-600">
                  <th className="py-2 px-3">Propietario</th>
                  <th className="py-2 px-3">Propiedad</th>
                  <th className="py-2 px-3">Tipo de Servicio</th>
                  <th className="py-2 px-3">Fechas</th>
                  <th className="py-2 px-3">Duración</th>
                  <th className="py-2 px-3">Estado</th>
                  <th className="py-2 px-3">Costo Estimado</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} className="border-b hover:bg-purple-900/30 transition-all duration-200">
                    <td className="py-2 px-3">{getOwnerName(task.owner_id)}</td>
                    <td className="py-2 px-3">{getPropertyAddress(task.property_id)}</td>
                    <td className="py-2 px-3">{task.service_type}</td>
                    <td className="py-2 px-3">
                      {task.scheduled_date} - {task.end_date}
                    </td>
                    <td className="py-2 px-3">{task.duration_days} días</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        task.status === 'completed' ? 'bg-green-100 text-green-800' :
                        task.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {translateStatus(task.status)}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-semibold">
                      ₡{calculateTaskCost(task).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <h2 className="text-xl font-semibold mb-4">Ingresos</h2>
      {loadingData ? <p className="text-center">Cargando...</p> : (
        <div className="overflow-x-auto mb-8">
          <table className="min-w-full bg-white rounded-2xl shadow">
            <thead>
              <tr className="bg-gradient-to-r from-[#23232a] to-[#3a2340] text-white font-bold rounded-t-2xl shadow border-l-4 border-purple-600">
                <th className="py-2 px-3">Propiedad</th>
                <th className="py-2 px-3">Monto</th>
                <th className="py-2 px-3">Descripción</th>
                <th className="py-2 px-3">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {revenues.map((r) => (
                <tr key={r.id} className="border-b hover:bg-purple-900/30 transition-all duration-200">
                  <td className="py-2 px-3">{getPropertyAddress(r.property_id)}</td>
                  <td className="py-2 px-3">₡{Number(r.amount).toLocaleString()}</td>
                  <td className="py-2 px-3">{r.description}</td>
                  <td className="py-2 px-3">{r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <h2 className="text-xl font-semibold mb-4">Gastos</h2>
      {loadingData ? <p className="text-center">Cargando...</p> : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-2xl shadow">
            <thead>
              <tr className="bg-gradient-to-r from-[#23232a] to-[#3a2340] text-white font-bold rounded-t-2xl shadow border-l-4 border-purple-600">
                <th className="py-2 px-3">Propiedad</th>
                <th className="py-2 px-3">Monto</th>
                <th className="py-2 px-3">Descripción</th>
                <th className="py-2 px-3">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-b hover:bg-purple-900/30 transition-all duration-200">
                  <td className="py-2 px-3">{getPropertyAddress(e.property_id)}</td>
                  <td className="py-2 px-3">₡{Number(e.amount).toLocaleString()}</td>
                  <td className="py-2 px-3">{e.description}</td>
                  <td className="py-2 px-3">{e.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 