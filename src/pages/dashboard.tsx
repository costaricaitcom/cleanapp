import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { withRetry } from "../utils/withRetry";

export default function Dashboard() {
  const auth = useAuth();
  const user = auth?.user;
  const loading = auth?.loading;
  const router = useRouter();

  const [kpis, setKpis] = useState({
    properties: 0,
    tasks: 0,
    revenues: 0,
    expenses: 0,
  });
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!loading && user) {
      setLoadingKpis(true);
      setError("");
      (async () => {
        try {
          const results: any[] = await Promise.all([
            withRetry(() => Promise.resolve(supabase.from("properties").select("id"))),
            withRetry(() => Promise.resolve(supabase.from("cleaning_tasks").select("id"))),
            withRetry(() => Promise.resolve(supabase.from("revenues").select("id"))),
            withRetry(() => Promise.resolve(supabase.from("expenses").select("id"))),
          ]);
          const [{ data: prop }, { data: tasks }, { data: revs }, { data: exps }] = results;
          setKpis({
            properties: prop?.length || 0,
            tasks: tasks?.length || 0,
            revenues: revs?.length || 0,
            expenses: exps?.length || 0,
          });
        } catch (err: any) {
          setError(err.message || "No se pudo cargar la información. Intenta de nuevo.");
        }
        setLoadingKpis(false);
      })();
    }
  }, [user, loading]);

  if (loading) return <p className="text-center mt-8 text-lg">Cargando...</p>;
  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center gap-4 bg-white bg-opacity-5 rounded-lg p-4 mb-6 shadow" style={{ border: '1px solid #23232a' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#23232a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#fff', fontWeight: 300 }}>
          <span>U</span>
        </div>
        <div>
          <div className="text-lg font-semibold text-white">{user.email}</div>
          <div className="text-blue-700 text-sm capitalize">{user.role}</div>
        </div>
      </div>
      <h1 className="text-3xl font-bold mb-6 text-white">Panel de Control</h1>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      {loadingKpis ? (
        <p className="text-center">Cargando KPIs...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-100 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold">{kpis.properties}</div>
            <div className="text-blue-700">Propiedades</div>
          </div>
          <div className="bg-green-100 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold">{kpis.tasks}</div>
            <div className="text-green-700">Tareas</div>
          </div>
          <div className="bg-purple-100 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold">{kpis.revenues}</div>
            <div className="text-purple-700">Ingresos</div>
          </div>
          <div className="bg-pink-100 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold">{kpis.expenses}</div>
            <div className="text-pink-700">Gastos</div>
          </div>
        </div>
      )}
    </div>
  );
} 