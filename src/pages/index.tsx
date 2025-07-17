import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/router";
import { useEffect } from "react";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) return <p>Cargando...</p>;
  if (!user) return null;

  return (
    <div>
      <h1>Bienvenido/a, {user.email}!</h1>
      {/* Aquí irá el dashboard y navegación */}
    </div>
  );
}