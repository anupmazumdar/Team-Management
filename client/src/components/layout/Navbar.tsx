import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Notification } from '../../types';
import {
  Bell,
  Layers,
  LogOut,
  Users,
  Shield,
  Briefcase,
  ChevronDown,
  Database,
} from 'lucide-react';
import { ExportModal } from '../common/ExportModal';

interface NavbarProps {
  currentTab?: string;
  setCurrentTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ setCurrentTab }) => {
  const { user, activeTeam, activeRole, teams, switchTeam, logout } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [showTeamDropdown, setShowTeamDropdown] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const teamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    const loadNotifications = async () => {
      try {
        const res = await api.get('/notifications');
        if (isMounted) {
          setNotifications(res.data.notifications || []);
          setUnreadCount(res.data.unreadCount || 0);
        }
      } catch {
        // ignore in silent polling
      }
    };

    loadNotifications();
    const interval = setInterval(loadNotifications, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <Shield className="w-3 h-3" /> ADMIN
          </span>
        );
      case 'lead':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
            <Briefcase className="w-3 h-3" /> LEAD
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
            <Users className="w-3 h-3" /> MEMBER
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-6 py-3 flex items-center justify-between">
      {/* Brand & Team Selector */}
      <div className="flex items-center gap-6">
        <div
          onClick={() => setCurrentTab('dashboard')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
              HustleX
            </div>
            <div className="text-[10px] tracking-wider uppercase text-indigo-400 font-semibold -mt-1">
              Workspace
            </div>
          </div>
        </div>

        {/* Team Dropdown */}
        <div className="relative" ref={teamRef}>
          <button
            onClick={() => setShowTeamDropdown(!showTeamDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-sm font-medium text-slate-200 transition-colors"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
            <span className="max-w-[150px] truncate">{activeTeam?.teamName || 'Select Team'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showTeamDropdown && (
            <div className="absolute top-full left-0 mt-1.5 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">
                Your Workspaces
              </div>
              <div className="space-y-1 mt-1">
                {teams.map((t) => (
                  <button
                    key={t.teamId}
                    onClick={() => {
                      switchTeam(t.teamId);
                      setShowTeamDropdown(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                      t.teamId === activeTeam?.teamId
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                        : 'text-slate-300 hover:bg-slate-800/70'
                    }`}
                  >
                    <span className="truncate">{t.teamName}</span>
                    <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {t.role}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Export Workspace & Admin Status */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowExportModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold shadow-sm transition-all hover:scale-[1.02]"
          title="Export database records, deliverables, and SLA audit logs"
        >
          <Database className="w-3.5 h-3.5 text-indigo-400" />
          <span>Export Data</span>
        </button>
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        teamName={activeTeam?.teamName || 'HustleX Workspace'}
      />

      {/* Right User Bar & Notifications */}
      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <div className="font-semibold text-sm text-slate-100 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-indigo-400" /> Notifications
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No notifications yet. You're all caught up!
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3.5 text-xs transition-colors ${
                        n.isRead ? 'opacity-60 bg-transparent' : 'bg-slate-800/40 hover:bg-slate-800/70'
                      }`}
                    >
                      <div className="font-semibold text-slate-200 mb-0.5 flex items-center justify-between">
                        <span>{n.title}</span>
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        )}
                      </div>
                      <p className="text-slate-400 leading-relaxed">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="p-2 border-t border-slate-800 text-center">
                <button
                  onClick={() => {
                    setShowNotifications(false);
                    setCurrentTab('notifications');
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  View All in Notifications Center →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Info & Dynamic Role */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
          <img
            src={user?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'}
            alt={user?.fullName}
            className="w-8 h-8 rounded-full ring-2 ring-indigo-500/30 object-cover"
          />
          <div className="hidden sm:block">
            <div className="text-xs font-semibold text-slate-200 leading-none">
              {user?.fullName}
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              {getRoleBadge(activeRole)}
            </div>
          </div>

          <button
            onClick={logout}
            title="Logout"
            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800/60 transition-colors ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
