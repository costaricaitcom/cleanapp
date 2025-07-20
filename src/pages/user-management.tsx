import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { withRetry } from '../utils/withRetry';
import { generateUUID } from '../utils/uuid';
import LoadingSpinner from "../components/LoadingSpinner";
import SearchInput from "../components/SearchInput";
import Notification from "../components/Notification";
import ConfirmDialog from "../components/ConfirmDialog";
import Tooltip from "../components/Tooltip";

export default function UserManagement() {
  const auth = useAuth();
  const user = auth?.user;
  const role = auth?.role;
  const loading = auth?.loading;
  const router = useRouter();

  const [users, setUsers] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [notification, setNotification] = useState({ show: false, type: 'success' as 'success' | 'error' | 'info' | 'warning', message: '' });
  const [error, setError] = useState("");

  // Form state for adding/editing users
  const [form, setForm] = useState({
    email: "",
    name: "",
    role: "owner",
    password: ""
  });

  useEffect(() => {
    if (!loading && (!user || role !== "admin")) {
      router.push("/dashboard");
    }
  }, [user, role, loading, router]);

  useEffect(() => {
    if (user && role === "admin") {
      fetchUsers();
    }
  }, [user, role]);

  const showNotification = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    setNotification({ show: true, type, message });
  };

  async function fetchUsers() {
    setLoadingData(true);
    setError("");
    try {
      await withRetry(async () => {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .order("created_at", { ascending: false });
        
        if (error) throw new Error(error.message);
        setUsers(data || []);
      }, 10000, 3);
    } catch (err) {
      setError("Error al cargar usuarios: " + (err.message || err));
    } finally {
      setLoadingData(false);
    }
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    
    if (!form.email || !form.name || !form.password) {
      setError("Todos los campos son requeridos");
      return;
    }

    try {
      await withRetry(async () => {
        // First, create the user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: form.email,
          password: form.password,
          email_confirm: true,
          user_metadata: {
            name: form.name,
            role: form.role
          }
        });

        if (authError) throw new Error(authError.message);

        // Then, add to our users table
        const { error: userError } = await supabase.from("users").insert([
          {
            id: authData.user.id,
            email: form.email,
            name: form.name,
            role: form.role
          }
        ]);

        if (userError) throw new Error(userError.message);

        showNotification('success', 'Usuario agregado exitosamente');
        setForm({ email: "", name: "", role: "owner", password: "" });
        setShowAddForm(false);
        fetchUsers();
      }, 10000, 3);
    } catch (err) {
      setError("Error al agregar usuario: " + (err.message || err));
    }
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;

    try {
      await withRetry(async () => {
        // Update user metadata in Auth
        const { error: authError } = await supabase.auth.admin.updateUserById(
          editingUser.id,
          {
            user_metadata: {
              name: form.name,
              role: form.role
            }
          }
        );

        if (authError) throw new Error(authError.message);

        // Update in our users table
        const { error: userError } = await supabase
          .from("users")
          .update({
            name: form.name,
            role: form.role
          })
          .eq("id", editingUser.id);

        if (userError) throw new Error(userError.message);

        showNotification('success', 'Usuario actualizado exitosamente');
        setEditingUser(null);
        setForm({ email: "", name: "", role: "owner", password: "" });
        fetchUsers();
      }, 10000, 3);
    } catch (err) {
      setError("Error al actualizar usuario: " + (err.message || err));
    }
  }

  async function handleDeleteUser(userId: string) {
    try {
      await withRetry(async () => {
        // Delete from our users table first
        const { error: userError } = await supabase
          .from("users")
          .delete()
          .eq("id", userId);

        if (userError) throw new Error(userError.message);

        // Then delete from Auth
        const { error: authError } = await supabase.auth.admin.deleteUser(userId);
        if (authError) throw new Error(authError.message);

        showNotification('success', 'Usuario eliminado exitosamente');
        setShowConfirmDelete(false);
        setUserToDelete(null);
        fetchUsers();
      }, 10000, 3);
    } catch (err) {
      setError("Error al eliminar usuario: " + (err.message || err));
    }
  }

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setForm({
      email: user.email,
      name: user.name || "",
      role: user.role || "owner",
      password: ""
    });
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setForm({ email: "", name: "", role: "owner", password: "" });
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'owner': return 'Propietario';
      case 'finance': return 'Finanzas';
      case 'cleaning_manager': return 'Jefe de Limpieza';
      case 'cleaner': return 'Limpiador';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-600 text-white';
      case 'owner': return 'bg-blue-600 text-white';
      case 'finance': return 'bg-purple-600 text-white';
      case 'cleaning_manager': return 'bg-orange-600 text-white';
      case 'cleaner': return 'bg-green-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  if (loading) return <LoadingSpinner text="Cargando..." />;
  if (!user || role !== "admin") return null;

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-red-700">Gestión de Usuarios</h1>

      {/* Add User Button */}
      <div className="mb-6 flex justify-between items-center">
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-red-600 text-white px-6 py-3 rounded-2xl hover:bg-red-700 transition-colors font-medium"
        >
          Agregar Usuario
        </button>
        <div className="text-sm text-gray-400">
          Total: {users.length} usuarios
        </div>
      </div>

      {/* Add User Form */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-2xl shadow mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Agregar Nuevo Usuario</h2>
          <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              className="input input-bordered p-2 rounded border"
              placeholder="Nombre completo"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
            />
            <input
              className="input input-bordered p-2 rounded border"
              placeholder="Correo electrónico"
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
            />
            <input
              className="input input-bordered p-2 rounded border"
              placeholder="Contraseña"
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
            />
            <select
              className="input input-bordered p-2 rounded border"
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
            >
              <option value="owner">Propietario</option>
              <option value="admin">Administrador</option>
              <option value="finance">Finanzas</option>
              <option value="cleaning_manager">Jefe de Limpieza</option>
              <option value="cleaner">Limpiador</option>
            </select>
            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                className="bg-red-600 text-white px-6 py-2 rounded-2xl hover:bg-red-700 transition"
              >
                Agregar Usuario
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setForm({ email: "", name: "", role: "owner", password: "" });
                }}
                className="bg-gray-600 text-white px-6 py-2 rounded-2xl hover:bg-gray-700 transition"
              >
                Cancelar
              </button>
            </div>
            {error && <span className="text-red-600 md:col-span-4">{error}</span>}
          </form>
        </div>
      )}

      {/* Edit User Form */}
      {editingUser && (
        <div className="bg-white p-6 rounded-2xl shadow mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Editar Usuario</h2>
          <form onSubmit={handleUpdateUser} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              className="input input-bordered p-2 rounded border"
              placeholder="Nombre completo"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
            />
            <input
              className="input input-bordered p-2 rounded border"
              placeholder="Correo electrónico"
              type="email"
              value={form.email}
              disabled
            />
            <select
              className="input input-bordered p-2 rounded border"
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
            >
              <option value="owner">Propietario</option>
              <option value="admin">Administrador</option>
              <option value="finance">Finanzas</option>
              <option value="cleaning_manager">Jefe de Limpieza</option>
              <option value="cleaner">Limpiador</option>
            </select>
            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-2xl hover:bg-blue-700 transition"
              >
                Actualizar Usuario
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="bg-gray-600 text-white px-6 py-2 rounded-2xl hover:bg-gray-700 transition"
              >
                Cancelar
              </button>
            </div>
            {error && <span className="text-red-600 md:col-span-4">{error}</span>}
          </form>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <SearchInput
          placeholder="Buscar usuarios por nombre, correo o rol..."
          value={searchTerm}
          onChange={setSearchTerm}
          className="max-w-md"
        />
      </div>

      <h2 className="text-xl font-semibold mb-4">Lista de Usuarios</h2>
      
      {loadingData ? (
        <LoadingSpinner text="Cargando usuarios..." />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-2xl shadow">
            <thead>
              <tr className="bg-gradient-to-r from-[#23232a] to-[#40233a] text-white font-bold rounded-t-2xl shadow border-l-4 border-red-600">
                <th className="py-2 px-3">Nombre</th>
                <th className="py-2 px-3">Correo Electrónico</th>
                <th className="py-2 px-3">Rol</th>
                <th className="py-2 px-3">Fecha de Creación</th>
                <th className="py-2 px-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id} className="border-b hover:bg-red-900/30 transition-all duration-200">
                  <td className="py-2 px-3 font-medium">{u.name || 'Sin nombre'}</td>
                  <td className="py-2 px-3">{u.email}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(u.role)}`}>
                      {getRoleDisplayName(u.role)}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-sm text-gray-600">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('es-ES') : 'N/A'}
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex space-x-2">
                      <Tooltip content="Editar usuario">
                        <button
                          onClick={() => handleEdit(u)}
                          className="bg-blue-600 text-white rounded-2xl px-3 py-1 hover:bg-blue-700 transition text-sm"
                        >
                          Editar
                        </button>
                      </Tooltip>
                      <Tooltip content="Eliminar usuario">
                        <button
                          onClick={() => {
                            setUserToDelete(u.id);
                            setShowConfirmDelete(true);
                          }}
                          className="bg-red-600 text-white rounded-2xl px-3 py-1 hover:bg-red-700 transition text-sm"
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
        title="Eliminar Usuario"
        message="¿Estás seguro de que quieres eliminar este usuario? Esta acción no se puede deshacer y eliminará todos los datos asociados."
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={() => userToDelete && handleDeleteUser(userToDelete)}
        onCancel={() => setShowConfirmDelete(false)}
        type="danger"
      />
    </div>
  );
} 