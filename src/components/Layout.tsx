import React, { useState, useEffect } from "react";
import Navbar from "./Navbar";
import Notification from "./Notification";
import { supabase } from "../lib/supabaseClient";

function ActivityFeed({ feed, onClose }) {
  return (
    <div className="fixed bottom-4 right-4 z-40 w-80 max-h-96 overflow-y-auto bg-gray-900/95 border border-gray-700 rounded-lg shadow-lg p-4 text-white">
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold text-lg">Actividad Reciente</span>
        <button onClick={onClose} className="text-gray-300 hover:text-white">✕</button>
      </div>
      <ul className="space-y-2">
        {feed.length === 0 && <li className="text-gray-400 text-sm">Sin actividad reciente.</li>}
        {feed.map((item, idx) => (
          <li key={idx} className="text-sm border-b border-gray-700 pb-1 last:border-b-0">
            <span className="font-semibold">{item.title}</span>
            <span className="block text-xs text-gray-400">{item.time}</span>
            <span className="block text-xs">{item.description}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const TABLES = [
  { name: 'cleaning_tasks', label: 'Tarea', labelPlural: 'Tareas' },
  { name: 'properties', label: 'Propiedad', labelPlural: 'Propiedades' },
  { name: 'users', label: 'Usuario', labelPlural: 'Usuarios' },
  { name: 'revenues', label: 'Ingreso', labelPlural: 'Ingresos' },
  { name: 'expenses', label: 'Gasto', labelPlural: 'Gastos' },
];

type NotifType = 'info' | 'warning' | 'error' | 'success';
interface Notif {
  show: boolean;
  type: NotifType;
  message: string;
}
interface FeedItem {
  title: string;
  time: string;
  description: string;
}
function getEventMessage(table: string, eventType: string, payload: any): { notif: Notif; feed: FeedItem } | null {
  const tableInfo = TABLES.find(t => t.name === table);
  const label = tableInfo ? tableInfo.label : table;
  let notifType: NotifType = 'info';
  if (eventType === 'DELETE') notifType = 'warning';
  else if (eventType === 'INSERT' || eventType === 'UPDATE') notifType = 'info';
  // Only allow valid event types
  if (!['INSERT', 'UPDATE', 'DELETE'].includes(eventType)) return null;
  switch (eventType) {
    case 'INSERT':
      return { notif: { show: true, type: notifType, message: `Nuevo ${label} creado` }, feed: { title: `${label} creado`, time: new Date().toLocaleTimeString(), description: `Nuevo ${label} agregado.` } };
    case 'UPDATE':
      return { notif: { show: true, type: notifType, message: `${label} actualizado` }, feed: { title: `${label} actualizado`, time: new Date().toLocaleTimeString(), description: `${label} actualizado.` } };
    case 'DELETE':
      return { notif: { show: true, type: notifType, message: `${label} eliminado` }, feed: { title: `${label} eliminado`, time: new Date().toLocaleTimeString(), description: `Un ${label.toLowerCase()} fue eliminado.` } };
    default:
      return null;
  }
}

export default function Layout({ children }) {
  const [notification, setNotification] = useState({ show: false, type: 'info', message: '' });
  const [activityFeed, setActivityFeed] = useState([]);
  const [showFeed, setShowFeed] = useState(false);

  useEffect(() => {
    const channels = TABLES.map(({ name }) =>
      supabase
        .channel(`public:${name}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: name }, payload => {
          const msg = getEventMessage(name, payload.eventType, payload);
          if (msg) {
            setNotification(msg.notif);
            setActivityFeed(feed => [msg.feed, ...feed].slice(0, 20));
          }
        })
        .subscribe()
    );
    return () => { channels.forEach(ch => ch.unsubscribe()); };
  }, []);

  return (
    <>
      <Navbar />
      <main style={{ padding: "2rem" }}>{children}</main>
      <Notification
        show={notification.show}
        type={notification.type}
        message={notification.message}
        onClose={() => setNotification({ ...notification, show: false })}
      />
      <button
        className="fixed bottom-4 right-4 z-50 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-full shadow-lg"
        onClick={() => setShowFeed(s => !s)}
        aria-label="Mostrar actividad"
      >
        🛎
      </button>
      {showFeed && (
        <ActivityFeed feed={activityFeed} onClose={() => setShowFeed(false)} />
      )}
    </>
  );
} 