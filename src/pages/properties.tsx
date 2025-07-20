import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import LoadingSpinner from "../components/LoadingSpinner";
import Notification from "../components/Notification";
import ConfirmDialog from "../components/ConfirmDialog";
import SearchInput from "../components/SearchInput";
import Pagination from "../components/Pagination";
import Tooltip from "../components/Tooltip";
import { withRetry } from '../utils/withRetry';
import { generateUUID } from '../utils/uuid';

export default function Properties() {
  const auth = useAuth();
  const user = auth?.user;
  const role = auth?.role;
  const loading = auth?.loading;
  const router = useRouter();

  const [properties, setProperties] = useState<any[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [form, setForm] = useState({
    location: "",
    province: "",
    canton: "",
    square_footage: "",
    number_of_rooms: "",
    number_of_people: "",
    special_cleaning_requirements: ""
  });
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  // Enhanced functionality state
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
  }>({ show: false, type: 'info', message: '' });

  // Provincias y Cantones de Costa Rica
  const provincias = [
    { nombre: "San José", cantones: ["San José", "Escazú", "Desamparados", "Puriscal", "Tarrazú", "Aserrí", "Mora", "Goicoechea", "Santa Ana", "Alajuelita", "Vásquez de Coronado", "Acosta", "Tibás", "Moravia", "Montes de Oca", "Turrubares", "Dota", "Curridabat", "Pérez Zeledón", "León Cortés"] },
    { nombre: "Alajuela", cantones: ["Alajuela", "San Ramón", "Grecia", "San Mateo", "Atenas", "Naranjo", "Palmares", "Poás", "Orotina", "San Carlos", "Zarcero", "Valverde Vega", "Upala", "Los Chiles", "Guatuso", "Río Cuarto"] },
    { nombre: "Cartago", cantones: ["Cartago", "Paraíso", "La Unión", "Jiménez", "Turrialba", "Alvarado", "Oreamuno", "El Guarco"] },
    { nombre: "Heredia", cantones: ["Heredia", "Barva", "Santo Domingo", "Santa Bárbara", "San Rafael", "San Isidro", "Belén", "Flores", "San Pablo", "Sarapiquí"] },
    { nombre: "Guanacaste", cantones: ["Liberia", "Nicoya", "Santa Cruz", "Bagaces", "Carrillo", "Cañas", "Abangares", "Tilarán", "Nandayure", "La Cruz", "Hojancha"] },
    { nombre: "Puntarenas", cantones: ["Puntarenas", "Esparza", "Buenos Aires", "Montes de Oro", "Osa", "Quepos", "Golfito", "Coto Brus", "Parrita", "Corredores", "Garabito"] },
    { nombre: "Limón", cantones: ["Limón", "Pococí", "Siquirres", "Talamanca", "Matina", "Guácimo"] }
  ];
  const [selectedProvincia, setSelectedProvincia] = useState("");
  const [selectedCanton, setSelectedCanton] = useState("");

  useEffect(() => {
    if (!loading && (!user || (role !== "admin" && role !== "owner"))) {
      router.push("/dashboard");
    }
  }, [user, role, loading, router]);

  useEffect(() => {
    if (user && (role === "admin" || role === "owner")) {
      fetchProperties();
    }
    // eslint-disable-next-line
  }, [user, role]);

  // Filter properties based on search term
  useEffect(() => {
    const filtered = properties.filter(property => 
      property.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.province?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.canton?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.special_cleaning_requirements?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProperties(filtered);
    setCurrentPage(1);
  }, [properties, searchTerm]);

  const showNotification = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    setNotification({ show: true, type, message });
  };

  // Format UUID to show only first 8 characters
  const formatUUID = (uuid: string) => {
    return uuid ? uuid.substring(0, 8) : '';
  };

  async function fetchProperties() {
    setLoadingData(true);
    setError("");
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
      showNotification('error', 'Error al cargar propiedades');
    } finally {
      setLoadingData(false);
    }
  }

  async function handleAddOrUpdate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    if (editingId) {
      try {
        await withRetry(async () => {
          const { error } = await supabase.from("properties").update({
            ...form,
            square_footage: Number(form.square_footage),
            number_of_rooms: Number(form.number_of_rooms),
            number_of_people: Number(form.number_of_people)
          }).eq("id", editingId);
          if (error) throw new Error(error.message);
        }, 5000, 3);
        setSuccessMsg("Propiedad actualizada exitosamente.");
        showNotification('success', 'Propiedad actualizada exitosamente');
        setEditingId(null);
        setForm({
          location: "",
          province: "",
          canton: "",
          square_footage: "",
          number_of_rooms: "",
          number_of_people: "",
          special_cleaning_requirements: ""
        });
        fetchProperties();
      } catch (err) {
        setError("Error al actualizar propiedad: " + (err.message || err));
        showNotification('error', 'Error al actualizar propiedad');
      }
    } else {
      try {
        await withRetry(async () => {
          const { error } = await supabase.from("properties").insert([
            {
              id: generateUUID(),
              ...form,
              owner_id: user.id,
              square_footage: Number(form.square_footage),
              number_of_rooms: Number(form.number_of_rooms),
              number_of_people: Number(form.number_of_people)
            }
          ]);
          if (error) throw new Error(error.message);
        }, 5000, 3);
        setSuccessMsg("Propiedad agregada exitosamente.");
        showNotification('success', 'Propiedad agregada exitosamente');
        setForm({
          location: "",
          province: "",
          canton: "",
          square_footage: "",
          number_of_rooms: "",
          number_of_people: "",
          special_cleaning_requirements: ""
        });
        fetchProperties();
      } catch (err) {
        setError("Error al agregar propiedad: " + (err.message || err));
        showNotification('error', 'Error al agregar propiedad');
      }
    }
  }

  const handleDeleteProperty = async (propertyId: string) => {
    try {
      await withRetry(async () => {
        const { error } = await supabase.from("properties").delete().eq("id", propertyId);
        if (error) throw new Error(error.message);
        fetchProperties();
        showNotification('success', 'Propiedad eliminada exitosamente');
      }, 5000, 3);
    } catch (err) {
      showNotification('error', 'Error al eliminar propiedad');
    }
    setShowConfirmDelete(false);
    setPropertyToDelete(null);
  };

  const handleEdit = (property: any) => {
    setEditingId(property.id);
    setForm({
      location: property.location || "",
      province: property.province || "",
      canton: property.canton || "",
      square_footage: property.square_footage?.toString() || "",
      number_of_rooms: property.number_of_rooms?.toString() || "",
      number_of_people: property.number_of_people?.toString() || "",
      special_cleaning_requirements: property.special_cleaning_requirements || ""
    });
    setSelectedProvincia(property.province || "");
    setSelectedCanton(property.canton || "");
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProperties = filteredProperties.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProperties.length / itemsPerPage);

  if (loading) return <LoadingSpinner size="lg" text="Cargando aplicación..." />;
  if (!user || (role !== "admin" && role !== "owner")) return null;

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-purple-700">Gestión de Propiedades</h1>
      
      <div className="bg-white/10 p-8 rounded-2xl shadow mb-8">
        <h2 className="text-2xl font-bold mb-6 text-purple-600 text-center">
          {editingId ? "Editar Propiedad" : "Agregar Nueva Propiedad"}
        </h2>
        <form onSubmit={handleAddOrUpdate} className="space-y-6">
          {/* First Row - Location and Province */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Ubicación *</label>
              <Tooltip content="Dirección específica de la propiedad">
                <input
                  className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none transition-colors"
                  placeholder="Ej: Calle 123, San José"
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  required
                />
              </Tooltip>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Provincia *</label>
              <Tooltip content="Selecciona la provincia de Costa Rica">
                <select
                  className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none transition-colors"
                  value={selectedProvincia}
                  onChange={e => {
                    setSelectedProvincia(e.target.value);
                    setSelectedCanton("");
                    setForm(f => ({ ...f, province: e.target.value, canton: "" }));
                  }}
                  required
                >
                  <option value="">Seleccionar Provincia</option>
                  {provincias.map(p => (
                    <option key={p.nombre} value={p.nombre}>{p.nombre}</option>
                  ))}
                </select>
              </Tooltip>
            </div>
          </div>

          {/* Second Row - Canton and Square Footage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Cantón *</label>
              <Tooltip content="Selecciona el cantón de la provincia">
                <select
                  className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none transition-colors"
                  value={selectedCanton}
                  onChange={e => {
                    setSelectedCanton(e.target.value);
                    setForm(f => ({ ...f, canton: e.target.value }));
                  }}
                  required
                  disabled={!selectedProvincia}
                >
                  <option value="">Seleccionar Cantón</option>
                  {selectedProvincia && provincias.find(p => p.nombre === selectedProvincia)?.cantones.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Tooltip>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Metros Cuadrados *</label>
              <Tooltip content="Área total de la propiedad en metros cuadrados">
                <input
                  className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none transition-colors"
                  placeholder="Ej: 150"
                  type="number"
                  min="1"
                  value={form.square_footage}
                  onChange={e => setForm(f => ({ ...f, square_footage: e.target.value }))}
                  required
                />
              </Tooltip>
            </div>
          </div>

          {/* Third Row - Rooms and People */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Número de Habitaciones *</label>
              <Tooltip content="Cantidad total de habitaciones en la propiedad">
                <input
                  className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none transition-colors"
                  placeholder="Ej: 3"
                  type="number"
                  min="1"
                  max="20"
                  value={form.number_of_rooms}
                  onChange={e => setForm(f => ({ ...f, number_of_rooms: e.target.value }))}
                  required
                />
              </Tooltip>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Capacidad Máxima (Personas) *</label>
              <Tooltip content="Número máximo de personas que pueden hospedarse">
                <input
                  className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none transition-colors"
                  placeholder="Ej: 6"
                  type="number"
                  min="1"
                  max="50"
                  value={form.number_of_people}
                  onChange={e => setForm(f => ({ ...f, number_of_people: e.target.value }))}
                  required
                />
              </Tooltip>
            </div>
          </div>

          {/* Fourth Row - Special Requirements */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Requerimientos Especiales de Limpieza</label>
            <Tooltip content="Instrucciones especiales para la limpieza de esta propiedad">
              <textarea
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none transition-colors resize-none"
                placeholder="Ej: Limpiar especialmente la cocina, atención a las alfombras, productos específicos para el baño..."
                value={form.special_cleaning_requirements}
                onChange={e => setForm(f => ({ ...f, special_cleaning_requirements: e.target.value }))}
                rows={4}
              />
            </Tooltip>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 pt-4">
            <button 
              type="submit" 
              className="bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium text-lg"
            >
              {editingId ? "Actualizar Propiedad" : "Crear Propiedad"}
            </button>
            
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm({
                    location: "",
                    province: "",
                    canton: "",
                    square_footage: "",
                    number_of_rooms: "",
                    number_of_people: "",
                    special_cleaning_requirements: ""
                  });
                  setSelectedProvincia("");
                  setSelectedCanton("");
                }}
                className="bg-gray-600 text-white px-8 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium text-lg"
              >
                Cancelar
              </button>
            )}
          </div>

          {/* Messages */}
          {error && (
            <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 text-red-400 text-center">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="bg-green-900/20 border border-green-500 rounded-lg p-4 text-green-400 text-center">
              {successMsg}
            </div>
          )}
        </form>
      </div>

      {/* Search */}
      <div className="mb-6">
        <SearchInput
          placeholder="Buscar propiedades por ubicación, provincia, cantón..."
          value={searchTerm}
          onChange={setSearchTerm}
          className="max-w-md"
        />
      </div>

      <h2 className="text-xl font-semibold mb-4">Lista de Propiedades</h2>
      
      {/* Error display for properties module only */}
      {error && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="text-red-400">
              <strong>Error al cargar propiedades:</strong> {error}
            </div>
            <button 
              onClick={fetchProperties}
              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}
      
      {loadingData ? (
        <LoadingSpinner text="Cargando propiedades..." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-2xl shadow">
              <thead>
                <tr className="bg-gradient-to-r from-[#23232a] to-[#3a2340] text-white font-bold rounded-t-2xl shadow border-l-4 border-purple-600">
                  <th className="py-2 px-3">Ubicación</th>
                  <th className="py-2 px-3">Provincia</th>
                  <th className="py-2 px-3">Cantón</th>
                  <th className="py-2 px-3">m²</th>
                  <th className="py-2 px-3">Habitaciones</th>
                  <th className="py-2 px-3">Personas</th>
                  <th className="py-2 px-3">Requerimientos</th>
                  <th className="py-2 px-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {currentProperties.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-purple-900/30 transition-all duration-200">
                    <td className="py-2 px-3">{p.location}</td>
                    <td className="py-2 px-3">{p.province}</td>
                    <td className="py-2 px-3">{p.canton}</td>
                    <td className="py-2 px-3">{p.square_footage}</td>
                    <td className="py-2 px-3">{p.number_of_rooms}</td>
                    <td className="py-2 px-3">{p.number_of_people}</td>
                    <td className="py-2 px-3">{p.special_cleaning_requirements}</td>
                    <td className="py-2 px-3">
                      <div className="flex space-x-2">
                        <Tooltip content="Editar propiedad">
                          <button
                            onClick={() => handleEdit(p)}
                            className="bg-blue-600 text-white rounded-2xl px-2 py-1 hover:bg-blue-700 transition"
                          >
                            Editar
                          </button>
                        </Tooltip>
                        <Tooltip content="Eliminar propiedad">
                          <button
                            onClick={() => {
                              setPropertyToDelete(p.id);
                              setShowConfirmDelete(true);
                            }}
                            className="bg-red-400 text-white rounded-2xl px-2 py-1 hover:bg-red-500 transition"
                          >
                            Eliminar
                          </button>
                        </Tooltip>
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
        title="Eliminar Propiedad"
        message="¿Estás seguro de que quieres eliminar esta propiedad? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={() => propertyToDelete && handleDeleteProperty(propertyToDelete)}
        onCancel={() => setShowConfirmDelete(false)}
        type="danger"
      />
    </div>
  );
} 