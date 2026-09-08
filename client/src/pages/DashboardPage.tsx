import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Task, ActivityLog } from '../types';
import {
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  CircleDashed,
  Send,
  Eye,
  Calendar,
  ArrowRight,
  History,
  ShieldCheck,
} from 'lucide-react';
import { format, isPast } from 'date-fns';

interface DashboardPageProps {
  setCurrentTab: (tab: string) => void;
  onSelectTask: (task: Task) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ setCurrentTab, onSelectTask }) => {
  const { user, activeTeam, activeRole } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);

  useEffect(() => {
    let isMounted = true;
    if (!activeTeam) return;

    const loadDashboardData = async () => {
      try {
        const [tasksRes, actRes] = await Promise.all([
          api.get('/tasks'),
          api.get(`/activity/${activeTeam.teamId}?limit=6`),
        ]);

        if (isMounted) {
          setTasks(tasksRes.data || []);
          setRecentActivity(actRes.data?.logs || []);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      }
    };

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, [activeTeam]);

  // Compute status counts
  const counts = {
    notStarted: tasks.filter((t) => t.status === 'NOT_STARTED').length,
    inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    submitted: tasks.filter((t) => t.status === 'SUBMITTED').length,
    underReview: tasks.filter((t) => t.status === 'UNDER_REVIEW').length,
    approved: tasks.filter((t) => t.status === 'APPROVED').length,
    changesRequired: tasks.filter((t) => t.status === 'CHANGES_REQUIRED').length,
  };

  const reviewQueueCount = counts.submitted + counts.underReview;
  const myPendingTasks = tasks.filter(
    (t) => t.assignedToId === user?.id && t.status !== 'APPROVED'
  );

  const upcomingDeadlines = [...tasks]
    .filter((t) => t.deadline && t.status !== 'APPROVED')
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="glass-panel rounded-2xl p-6 bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
            Workspace Overview • {activeTeam?.teamName}
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Welcome back, {user?.fullName}!
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
            You are operating with <strong className="text-indigo-300 font-bold">{activeRole?.toUpperCase()}</strong> privileges. Track verification states, review submissions, and manage 6-month progress milestones.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {(activeRole === 'admin' || activeRole === 'lead') && reviewQueueCount > 0 && (
            <button
              onClick={() => setCurrentTab('review-queue')}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-600/25 flex items-center gap-2 transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Review Queue ({reviewQueueCount})</span>
            </button>
          )}

          <button
            onClick={() => setCurrentTab('my-tasks')}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 flex items-center gap-2 transition-all"
          >
            <span>My Tasks ({myPendingTasks.length})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 6 Verification State Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => setCurrentTab('tasks')}
          className="glass-card rounded-xl p-4 border border-slate-800 cursor-pointer hover:border-slate-700"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1 font-medium">
            <span>Not Started</span>
            <CircleDashed className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-extrabold text-slate-200">{counts.notStarted}</div>
        </div>

        <div
          onClick={() => setCurrentTab('tasks')}
          className="glass-card rounded-xl p-4 border border-slate-800 cursor-pointer hover:border-blue-500/30"
        >
          <div className="flex items-center justify-between text-blue-400 text-xs mb-1 font-medium">
            <span>In Progress</span>
            <PlayCircle className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-blue-300">{counts.inProgress}</div>
        </div>

        <div
          onClick={() => setCurrentTab('tasks')}
          className="glass-card rounded-xl p-4 border border-slate-800 cursor-pointer hover:border-purple-500/30"
        >
          <div className="flex items-center justify-between text-purple-300 text-xs mb-1 font-medium">
            <span>Submitted</span>
            <Send className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-purple-300">{counts.submitted}</div>
        </div>

        <div
          onClick={() => setCurrentTab('tasks')}
          className="glass-card rounded-xl p-4 border border-slate-800 cursor-pointer hover:border-amber-500/30"
        >
          <div className="flex items-center justify-between text-amber-300 text-xs mb-1 font-medium">
            <span>Under Review</span>
            <Eye className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-300">{counts.underReview}</div>
        </div>

        <div
          onClick={() => setCurrentTab('tasks')}
          className="glass-card rounded-xl p-4 border border-slate-800 cursor-pointer hover:border-emerald-500/30"
        >
          <div className="flex items-center justify-between text-emerald-400 text-xs mb-1 font-medium">
            <span>Approved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-300">{counts.approved}</div>
        </div>

        <div
          onClick={() => setCurrentTab('tasks')}
          className="glass-card rounded-xl p-4 border border-slate-800 cursor-pointer hover:border-rose-500/30"
        >
          <div className="flex items-center justify-between text-rose-400 text-xs mb-1 font-medium">
            <span>Changes Req.</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold text-rose-300">{counts.changesRequired}</div>
        </div>
      </div>

      {/* Two Column Grid: Upcoming Deadlines & 6-Mo Internship Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Deadlines Table */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" /> Upcoming Task Deadlines
              </h3>
              <button
                onClick={() => setCurrentTab('calendar')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Calendar View →
              </button>
            </div>

            <div className="divide-y divide-slate-800/60">
              {upcomingDeadlines.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No upcoming deadlines pending.
                </div>
              ) : (
                upcomingDeadlines.map((t) => {
                  const overdue = t.deadline && isPast(new Date(t.deadline));
                  return (
                    <div
                      key={t.id}
                      onClick={() => onSelectTask(t)}
                      className="py-3 flex items-center justify-between gap-4 cursor-pointer group hover:bg-slate-800/40 px-2 rounded-xl transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors truncate">
                          {t.title}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>{t.project?.name}</span>
                          <span>•</span>
                          <span>{t.assignedTo?.fullName || 'Unassigned'}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`text-xs font-mono font-semibold ${
                            overdue ? 'text-rose-400' : 'text-slate-300'
                          }`}
                        >
                          {t.deadline ? format(new Date(t.deadline), 'MMM d') : ''}
                        </span>
                        <div className="text-[10px] text-slate-400 uppercase font-mono">
                          {t.status.replace('_', ' ')}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity Audit Feed Card */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-400" /> Recent Team Activity
              </h3>
              <button
                onClick={() => setCurrentTab('activity')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Full Audit Trail →
              </button>
            </div>

            <div className="divide-y divide-slate-800/60">
              {recentActivity.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No activity recorded yet.
                </div>
              ) : (
                recentActivity.map((act) => (
                  <div
                    key={act.id}
                    className="py-3 flex items-center justify-between gap-4 px-2 rounded-xl hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-200 truncate">
                        {act.actor?.fullName || 'Team Member'}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                        {act.action.replace('_', ' ')}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {format(new Date(act.createdAt), 'MMM d, HH:mm')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
