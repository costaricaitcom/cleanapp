import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

export default function Employees() {
  const auth = useAuth();
  const user = auth?.user;
  const role = auth?.role;
  const loading = auth?.loading;
  const router = useRouter();

  const [employees, setEmployees] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [form, setForm] = useState({
    email: "",
    name: "",
    role: "cleaner"
  });
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (!loading && (!user || role !== "admin")) {
      router.push("/dashboard");
    }
  }, [user, role, loading, router]);

  useEffect(() => {
    if (user && role === "admin") {
      fetchEmployees();
    }
    // eslint-disable-next-line
  }, [user, role]);

  async function fetchEmployees() {
    setLoadingData(true);
    const { data, error } = await supabase.from("users").select("*").neq("role", "owner");
    if (!error) setEmployees(data || []);
    setLoadingData(false);
  }

  async function handleAddOrUpdate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    if (editingId) {
      // Update employee (only name and role)
      const { error } = await supabase.from("users").update({
        name: form.name,
        role: form.role
      }).eq("id", editingId);
      if (error) setError(error.message);
      else {
        setSuccessMsg("Empleado actualizado exitosamente.");
        setEditingId(null);
        setForm({ email: "", name: "", role: "cleaner" });
        fetchEmployees();
      }
    } else {
      // Create user in Supabase Auth and in users table
      const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
        email: form.email,
        password: Math.random().toString(36).slice(-8), // random password
        email_confirm: true
      });
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      const { error: userError } = await supabase.from("users").insert([
        {
          id: signUpData.user.id,
          email: form.email,
          name: form.name,
          role: form.role
        }
      ]);
      if (userError) setError(userError.message);
      else {
        setSuccessMsg("Empleado agregado exitosamente.");
        setForm({ email: "", name: "", role: "cleaner" });
        fetchEmployees();
      }
    }
  }

  if (loading) return <p className="text-center mt-8 text-lg">Loading...</p>;
  if (!user || role !== "admin") return null;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-pink-700">Gestión de Empleados</h1>
      <form onSubmit={handleAddOrUpdate} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-6 rounded-2xl shadow mb-8">
        <input className="input input-bordered p-2 rounded border" placeholder="Correo electrónico" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
        <input className="input input-bordered p-2 rounded border" placeholder="Nombre" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
        <select className="input input-bordered p-2 rounded border" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
          <option value="cleaner">Limpiador</option>
          <option value="cleaning_manager">Jefe de Limpieza</option>
          <option value="finance">Finanzas</option>
          <option value="admin">Administrador</option>
        </select>
        <button type="submit" className="bg-pink-600 text-white rounded-2xl px-4 py-2 hover:bg-pink-700 transition">{editingId ? "Actualizar Empleado" : "Agregar Empleado"}</button>
        {error && <span className="text-red-600 col-span-full">{error}</span>}
        {successMsg && <span className="text-green-600 col-span-full">{successMsg}</span>}
      </form>
      <h2 className="text-xl font-semibold mb-4">Lista de Empleados</h2>
      {loadingData ? <p className="text-center">Cargando...</p> : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-2xl shadow">
            <thead>
              <tr className="bg-gradient-to-r from-[#23232a] to-[#40233a] text-white font-bold rounded-t-2xl shadow border-l-4 border-pink-600">
                <th className="py-2 px-3">ID</th>
                <th className="py-2 px-3">Correo electrónico</th>
                <th className="py-2 px-3 flex items-center gap-1">👤 <span>Nombre</span></th>
                <th className="py-2 px-3">Rol</th>
                <th className="py-2 px-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id} className="border-b hover:bg-pink-900/30 transition-all duration-200">
                  <td className="py-2 px-3 text-xs break-all">{e.id}</td>
                  <td className="py-2 px-3">{e.email}</td>
                  <td className="py-2 px-3">{e.name}</td>
                  <td className="py-2 px-3">{e.role}</td>
                  <td className="py-2 px-3">
                    <button className="bg-gray-300 text-gray-700 rounded-2xl px-2 py-1 mr-2" onClick={() => {
                      setEditingId(e.id);
                      setForm({
                        email: e.email,
                        name: e.name || "",
                        role: e.role || "cleaner"
                      });
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