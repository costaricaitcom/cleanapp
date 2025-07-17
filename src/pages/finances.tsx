import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

export default function Finances() {
  const auth = useAuth();
  const user = auth?.user;
  const role = auth?.role;
  const loading = auth?.loading;
  const router = useRouter();

  const [revenues, setRevenues] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [form, setForm] = useState({
    type: "revenue",
    property_id: "",
    amount: "",
    description: "",
    date: ""
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && (!user || (role !== "admin" && role !== "owner" && role !== "finance"))) {
      router.push("/dashboard");
    }
  }, [user, role, loading, router]);

  useEffect(() => {
    if (user && (role === "admin" || role === "owner" || role === "finance")) {
      fetchData();
    }
    // eslint-disable-next-line
  }, [user, role]);

  async function fetchData() {
    setLoadingData(true);
    let revQuery = supabase.from("revenues").select("*");
    let expQuery = supabase.from("expenses").select("*");
    if (role === "owner") {
      revQuery = revQuery.eq("owner_id", user.id);
      expQuery = expQuery.eq("owner_id", user.id);
    }
    const { data: revs } = await revQuery;
    const { data: exps } = await expQuery;
    setRevenues(revs || []);
    setExpenses(exps || []);
    setLoadingData(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.type === "revenue") {
      const { error } = await supabase.from("revenues").insert([
        {
          property_id: form.property_id,
          amount: Number(form.amount),
          description: form.description,
          date: form.date,
          recorded_by: user.id,
          owner_id: user.id
        }
      ]);
      if (error) setError(error.message);
      else fetchData();
    } else {
      const { error } = await supabase.from("expenses").insert([
        {
          property_id: form.property_id,
          amount: Number(form.amount),
          description: form.description,
          type: "General",
          date: form.date,
          recorded_by: user.id,
          owner_id: user.id
        }
      ]);
      if (error) setError(error.message);
      else fetchData();
    }
    setForm({ type: "revenue", property_id: "", amount: "", description: "", date: "" });
  }

  if (loading) return <p className="text-center mt-8 text-lg">Loading...</p>;
  if (!user || (role !== "admin" && role !== "owner" && role !== "finance")) return null;

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-purple-700">Gestión Financiera</h1>
      <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-white p-6 rounded-2xl shadow mb-8">
        <select className="input input-bordered p-2 rounded border" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
          <option value="revenue">Ingreso</option>
          <option value="expense">Gasto</option>
        </select>
        <input className="input input-bordered p-2 rounded border" placeholder="ID Propiedad" value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))} required />
        <input className="input input-bordered p-2 rounded border" placeholder="Monto" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
        <input className="input input-bordered p-2 rounded border" placeholder="Descripción" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        <input className="input input-bordered p-2 rounded border" placeholder="Fecha" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
        <button type="submit" className="bg-purple-600 text-white rounded-2xl px-4 py-2 hover:bg-purple-700 transition col-span-full md:col-span-1">Agregar</button>
        {error && <span className="text-red-600 col-span-full">{error}</span>}
      </form>
      <h2 className="text-xl font-semibold mb-4">Ingresos</h2>
      {loadingData ? <p className="text-center">Cargando...</p> : (
        <div className="overflow-x-auto mb-8">
          <table className="min-w-full bg-white rounded-2xl shadow">
            <thead>
              <tr className="bg-gradient-to-r from-[#23232a] to-[#3a2340] text-white font-bold rounded-t-2xl shadow border-l-4 border-purple-600">
                <th className="py-2 px-3">ID</th>
                <th className="py-2 px-3">Propiedad</th>
                <th className="py-2 px-3 flex items-center gap-1">💸 <span>Monto</span></th>
                <th className="py-2 px-3">Descripción</th>
                <th className="py-2 px-3">Fecha</th>
                <th className="py-2 px-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {revenues.map((r) => (
                <tr key={r.id} className="border-b hover:bg-purple-900/30 transition-all duration-200">
                  <td className="py-2 px-3 text-xs break-all">{r.id}</td>
                  <td className="py-2 px-3">{r.property_id}</td>
                  <td className="py-2 px-3">{r.amount}</td>
                  <td className="py-2 px-3">{r.description}</td>
                  <td className="py-2 px-3">{r.date}</td>
                  <td className="py-2 px-3">
                    {/* Placeholder for edit/delete */}
                    <button className="bg-gray-300 text-gray-700 rounded-2xl px-2 py-1 mr-2" disabled>Editar</button>
                    <button className="bg-red-400 text-white rounded-2xl px-2 py-1" disabled>Eliminar</button>
                  </td>
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
                <th className="py-2 px-3">ID</th>
                <th className="py-2 px-3">Propiedad</th>
                <th className="py-2 px-3 flex items-center gap-1">💸 <span>Monto</span></th>
                <th className="py-2 px-3">Descripción</th>
                <th className="py-2 px-3">Fecha</th>
                <th className="py-2 px-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-b hover:bg-purple-900/30 transition-all duration-200">
                  <td className="py-2 px-3 text-xs break-all">{e.id}</td>
                  <td className="py-2 px-3">{e.property_id}</td>
                  <td className="py-2 px-3">{e.amount}</td>
                  <td className="py-2 px-3">{e.description}</td>
                  <td className="py-2 px-3">{e.date}</td>
                  <td className="py-2 px-3">
                    {/* Placeholder for edit/delete */}
                    <button className="bg-gray-300 text-gray-700 rounded-2xl px-2 py-1 mr-2" disabled>Editar</button>
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