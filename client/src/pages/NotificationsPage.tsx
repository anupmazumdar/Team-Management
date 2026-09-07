import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Notification } from '../types';
import { Bell, CheckCircle2, ShieldCheck, MessageSquare, Clock } from 'lucide-react';
import { format } from 'date-fns';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadOnly, setUnreadOnly] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data?.notifications || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const markOneRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = notifications.filter((n) => (unreadOnly ? !n.isRead : true));

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Notifications Center</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            System notifications for task assignments, review submissions, and mentions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
              className="accent-indigo-600 rounded"
            />
            <span>Unread Only</span>
          </label>

          <button
            onClick={markAllRead}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
          >
            Mark All Read
          </button>
        </div>
      </div>

      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden divide-y divide-slate-800/60">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No notifications found.
          </div>
        ) : (
          filtered.map((n) => (
            <div
              key={n.id}
              onClick={() => markOneRead(n.id)}
              className={`p-4 flex items-start justify-between gap-4 cursor-pointer transition-colors ${
                n.isRead ? 'bg-transparent opacity-60' : 'bg-slate-800/30 hover:bg-slate-800/60'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-200 text-xs">{n.title}</span>
                  {!n.isRead && (
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                  )}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{n.message}</p>
              </div>

              <span className="text-[10px] text-slate-400 font-mono shrink-0">
                {format(new Date(n.createdAt), 'MMM d, HH:mm')}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
