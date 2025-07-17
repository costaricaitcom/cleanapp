import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const { user } = useAuth() || {};

  if (user) {
    router.push("/");
    return null;
  }

  const handleRegister = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setError(error.message);
    else router.push("/");
  };

  return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <form onSubmit={handleRegister} className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-blue-700">Registrarse</h2>
        <div className="mb-4">
          <label className="block text-gray-200 mb-1">Correo electrónico</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Correo electrónico" required className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div className="mb-6">
          <label className="block text-gray-200 mb-1">Contraseña</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña" required className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-2xl hover:bg-blue-700 transition">Registrarse</button>
        {error && <p className="text-red-600 mt-4 text-center">{error}</p>}
      </form>
    </div>
  );
} 