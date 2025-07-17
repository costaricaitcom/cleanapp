import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

export default function Properties() {
  const auth = useAuth();
  const user = auth?.user;
  const role = auth?.role;
  const loading = auth?.loading;
  const router = useRouter();

  const [properties, setProperties] = useState<any[]>([]);
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

  async function fetchProperties() {
    setLoadingData(true);
    let query = supabase.from("properties").select("*");
    if (role === "owner") {
      query = query.eq("owner_id", user.id);
    }
    const { data, error } = await query;
    if (!error) setProperties(data || []);
    setLoadingData(false);
  }

  async function handleAddOrUpdate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    if (editingId) {
      // Update property
      const { error } = await supabase.from("properties").update({
        ...form,
        square_footage: Number(form.square_footage),
        number_of_rooms: Number(form.number_of_rooms),
        number_of_people: Number(form.number_of_people)
      }).eq("id", editingId);
      if (error) setError(error.message);
      else {
        setSuccessMsg("Propiedad actualizada exitosamente.");
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
      }
    } else {
      // Insertar propiedad dejando que la base de datos genere el UUID automáticamente
      const { data, error } = await supabase.from("properties").insert([
        {
          ...form,
          owner_id: user.id,
          square_footage: Number(form.square_footage),
          number_of_rooms: Number(form.number_of_rooms),
          number_of_people: Number(form.number_of_people)
        }
      ]);
      if (error) setError(error.message);
      else {
        setSuccessMsg("Propiedad agregada exitosamente.");
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
      }
    }
  }

  if (loading) return <p className="text-center mt-8 text-lg">Loading...</p>;
  if (!user || (role !== "admin" && role !== "owner")) return null;

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-blue-700">Gestión de Propiedades</h1>
      <form onSubmit={handleAddOrUpdate} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-6 rounded-2xl shadow mb-8">
        {/* Dirección */}
        <input className="input input-bordered p-2 rounded-2xl border" placeholder="Dirección" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} required />
        {/* Provincia */}
        <select
          className="input input-bordered p-2 rounded-2xl border"
          value={selectedProvincia}
          onChange={e => {
            setSelectedProvincia(e.target.value);
            setSelectedCanton("");
            setForm(f => ({ ...f, province: e.target.value, canton: "" }));
          }}
          required
        >
          <option value="">Provincia</option>
          {provincias.map(p => (
            <option key={p.nombre} value={p.nombre}>{p.nombre}</option>
          ))}
        </select>
        {/* Cantón */}
        <select
          className="input input-bordered p-2 rounded-2xl border"
          value={selectedCanton}
          onChange={e => {
            setSelectedCanton(e.target.value);
            setForm(f => ({ ...f, canton: e.target.value }));
          }}
          required
          disabled={!selectedProvincia}
        >
          <option value="">Cantón</option>
          {selectedProvincia && provincias.find(p => p.nombre === selectedProvincia)?.cantones.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {/* Metros cuadrados */}
        <input className="input input-bordered p-2 rounded-2xl border" placeholder="Metros cuadrados" type="text" value={form.square_footage} onChange={e => setForm(f => ({ ...f, square_footage: e.target.value }))} />
        {/* Habitaciones */}
        <select
          className="input input-bordered p-2 rounded-2xl border"
          value={form.number_of_rooms}
          onChange={e => setForm(f => ({ ...f, number_of_rooms: e.target.value }))}
          required
        >
          <option value="">Habitaciones</option>
          {[...Array(10)].map((_, i) => (
            <option key={i+1} value={i+1}>{i+1}</option>
          ))}
        </select>
        {/* Personas */}
        <input className="input input-bordered p-2 rounded-2xl border" placeholder="Personas" type="number" value={form.number_of_people} onChange={e => setForm(f => ({ ...f, number_of_people: e.target.value }))} />
        {/* Requerimientos especiales */}
        <input className="input input-bordered p-2 rounded-2xl border md:col-span-2" placeholder="Requerimientos especiales" value={form.special_cleaning_requirements} onChange={e => setForm(f => ({ ...f, special_cleaning_requirements: e.target.value }))} />
        <button type="submit" className="bg-blue-600 text-white rounded-2xl px-4 py-2 hover:bg-blue-700 transition">{editingId ? "Actualizar Propiedad" : "Agregar Propiedad"}</button>
        {error && <span className="text-red-600 col-span-full">{error}</span>}
        {successMsg && <span className="text-green-600 col-span-full">{successMsg}</span>}
      </form>
      <h2 className="text-xl font-semibold mb-4">Lista de Propiedades</h2>
      {loadingData ? <p className="text-center">Cargando...</p> : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-2xl shadow">
            <thead>
              <tr className="bg-gradient-to-r from-[#23232a] to-[#233a2d] text-white font-bold rounded-t-2xl shadow border-l-4 border-green-600">
                <th className="py-2 px-3">ID</th>
                <th className="py-2 px-3 flex items-center gap-1">🏠 <span>Dirección</span></th>
                <th className="py-2 px-3">Provincia</th>
                <th className="py-2 px-3">Cantón</th>
                <th className="py-2 px-3">Metros²</th>
                <th className="py-2 px-3">Habitaciones</th>
                <th className="py-2 px-3">Personas</th>
                <th className="py-2 px-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((p) => (
                <tr key={p.id} className="border-b hover:bg-blue-900/30 transition-all duration-200">
                  <td className="py-2 px-3 text-xs break-all">{p.id}</td>
                  <td className="py-2 px-3">{p.location}</td>
                  <td className="py-2 px-3">{p.province}</td>
                  <td className="py-2 px-3">{p.canton}</td>
                  <td className="py-2 px-3">{p.square_footage}</td>
                  <td className="py-2 px-3">{p.number_of_rooms}</td>
                  <td className="py-2 px-3">{p.number_of_people}</td>
                  <td className="py-2 px-3">
                    <button className="bg-gray-300 text-gray-700 rounded-2xl px-2 py-1 mr-2" onClick={() => {
                      setEditingId(p.id);
                      setForm({
                        location: p.location || "",
                        province: p.province || "",
                        canton: p.canton || "",
                        square_footage: p.square_footage || "",
                        number_of_rooms: p.number_of_rooms || "",
                        number_of_people: p.number_of_people || "",
                        special_cleaning_requirements: p.special_cleaning_requirements || ""
                      });
                      setSelectedProvincia(p.province || "");
                      setSelectedCanton(p.canton || "");
                      setError("");
                      setSuccessMsg("");
                    }}>Editar</button>
                    <button className="bg-red-400 text-white rounded-2xl px-2 py-1" disabled>Eliminar</button>
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