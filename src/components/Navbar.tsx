import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";

const ROLES = [
  { value: "admin", label: "Administrador" },
  { value: "owner", label: "Propietario" },
  { value: "finance", label: "Finanzas" },
  { value: "cleaning_manager", label: "Jefe de Limpieza" },
  { value: "cleaner", label: "Limpiador" },
];

export default function Navbar() {
  const auth = useAuth();
  const user = auth?.user;
  const role = auth?.role;
  const setSimulatedRole = auth?.setSimulatedRole;
  const simulatedRole = auth?.simulatedRole;
  const router = useRouter();
  const [changingRole, setChangingRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState(role);
  const effectiveRole = simulatedRole || role;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Allow changing role for any authenticated user
  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSimulatedRole && setSimulatedRole(e.target.value);
    setSelectedRole(e.target.value);
  };

  return (
    <nav className="navbar-animated px-6 py-3 shadow" style={{ position: 'relative', background: 'linear-gradient(90deg, #007aff 0%, #0051a8 100%)', color: '#fff' }}>
      <div className="dust-container" aria-hidden="true">
        <div className="dust-dot dust-dot-1" />
        <div className="dust-dot dust-dot-2" />
        <div className="dust-dot dust-dot-3" />
        <div className="dust-dot dust-dot-4" />
        <div className="dust-dot dust-dot-5" />
        <div className="dust-dot dust-dot-6" />
      </div>
      <div className="flex items-center gap-6 w-full text-white" style={{ zIndex: 1, position: 'relative', color: '#fff' }}>
        <Link href="/dashboard" className={`tracking-wide text-white !text-white hover:text-white transition no-underline${router.pathname === '/dashboard' ? ' font-bold' : ''}`} style={{ color: '#fff' }}>Inicio</Link>
        {user && (effectiveRole === "admin" || effectiveRole === "owner") && <Link href="/properties" className={`text-white !text-white hover:text-white transition no-underline${router.pathname === '/properties' ? ' font-bold' : ''}`}>Propiedades</Link>}
        {user && (effectiveRole === "admin" || effectiveRole === "cleaning_manager" || effectiveRole === "cleaner") && <Link href="/tasks" className={`text-white !text-white hover:text-white transition no-underline${router.pathname === '/tasks' ? ' font-bold' : ''}`}>Tareas</Link>}
        {user && <Link href="/calendar" className={`text-white !text-white hover:text-white transition no-underline${router.pathname === '/calendar' ? ' font-bold' : ''}`}>Calendario</Link>}
        {user && (effectiveRole === "admin" || effectiveRole === "owner" || effectiveRole === "finance") && <Link href="/finances" className={`text-white !text-white hover:text-white transition no-underline${router.pathname === '/finances' ? ' font-bold' : ''}`}>Finanzas</Link>}
        {user && effectiveRole === "admin" && <Link href="/employees" className={`text-white !text-white hover:text-white transition no-underline${router.pathname === '/employees' ? ' font-bold' : ''}`}>Empleados</Link>}
        <div className="flex-1" />
        {!user && <Link href="/login" className={`text-white !text-white hover:text-white transition no-underline${router.pathname === '/login' ? ' font-bold' : ''}`}>Iniciar sesión</Link>}
        {!user && <Link href="/register" className={`text-white !text-white hover:text-white transition no-underline${router.pathname === '/register' ? ' font-bold' : ''}`}>Registrarse</Link>}
        {user && (
          <>
            <select
              className="bg-white text-blue-700 rounded px-2 py-1 mr-4 border focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={selectedRole || ""}
              onChange={handleRoleChange}
              disabled={changingRole}
              title="Cambiar rol para pruebas"
            >
              {ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded shadow transition"
            >
              Cerrar sesión
            </button>
          </>
        )}
      </div>
    </nav>
  );
} 