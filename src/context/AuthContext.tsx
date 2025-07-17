import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "../lib/supabaseClient";
import { User } from "@supabase/supabase-js";

// Define the AuthContext type
interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: string | null;
  setSimulatedRole: (role: string | null) => void;
  simulatedRole: string | null;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulatedRole, setSimulatedRole] = useState<string | null>(null);

  useEffect(() => {
    const getUserAndRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        // Fetch the user's role from the users table
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single();
        setRole(data?.role ?? null);
      } else {
        setRole(null);
      }
      setLoading(false);
    };
    getUserAndRole();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single();
        setRole(data?.role ?? null);
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  const effectiveRole = simulatedRole || role;

  return (
    <AuthContext.Provider value={{ user, loading, role: effectiveRole, setSimulatedRole, simulatedRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType | undefined {
  return useContext(AuthContext);
}