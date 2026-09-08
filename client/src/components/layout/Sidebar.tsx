import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  CheckSquare,
  ListTodo,
  FolderKanban,
  Users,
  MessageSquare,
  History,
  Calendar,
  ShieldCheck,
  Bell,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  reviewCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab, reviewCount = 0 }) => {
  const { activeRole } = useAuth();
  const isAdminOrLead = activeRole === 'admin' || activeRole === 'lead';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'my-tasks', label: 'My Tasks', icon: CheckSquare },
    { id: 'tasks', label: 'All Tasks', icon: ListTodo },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'team', label: 'Team & Roles', icon: Users },
    { id: 'chat', label: 'Project Chat', icon: MessageSquare },
    { id: 'calendar', label: 'Calendar View', icon: Calendar },
    { id: 'activity', label: 'Audit Trail', icon: History },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <aside className="w-64 bg-slate-900/60 border-r border-slate-800/80 flex flex-col justify-between py-6 px-4 select-none">
      <div className="space-y-6">
        {/* Main Navigation */}
        <div>
          <div className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Workspace
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Leadership & Verification Section */}
        {isAdminOrLead && (
          <div>
            <div className="px-3 text-[11px] font-semibold text-amber-400/90 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Verification & Admin</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                {activeRole?.toUpperCase()}
              </span>
            </div>
            <nav className="space-y-1">
              <button
                onClick={() => setCurrentTab('review-queue')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  currentTab === 'review-queue'
                    ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/25 font-semibold'
                    : 'text-amber-300/80 hover:text-amber-200 hover:bg-amber-950/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Review Queue</span>
                </div>
                {reviewCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold">
                    {reviewCount}
                  </span>
                )}
              </button>
            </nav>
          </div>
        )}
      </div>

      {/* Role Scoped Footer Info */}
      <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400">
        <div className="flex items-center justify-between font-semibold text-slate-300 mb-1">
          <span>Active Policy</span>
          <span className="text-emerald-400 text-[10px]">Real-Time Role</span>
        </div>
        <p className="text-[10px] leading-relaxed text-slate-400">
          Permissions verified live in PostgreSQL at request time.
        </p>
      </div>
    </aside>
  );
};
