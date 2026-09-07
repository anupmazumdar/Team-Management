import React, { useState } from 'react';
import { InternshipPeriod, Milestone } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  CheckCircle2,
  Clock,
  Circle,
  Calendar,
  Edit3,
  Plus,
  Trash2,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { format } from 'date-fns';

interface InternshipTrackerProps {
  periods: InternshipPeriod[];
  stats: {
    totalMilestones: number;
    completedMilestones: number;
    overallPercentage: number;
  };
  onUpdate: () => void;
}

export const InternshipTracker: React.FC<InternshipTrackerProps> = ({
  periods,
  stats,
  onUpdate,
}) => {
  const { activeRole, activeTeam } = useAuth();
  const isAdminOrLead = activeRole === 'admin' || activeRole === 'lead';

  const [editingPeriod, setEditingPeriod] = useState<InternshipPeriod | null>(null);
  const [editMilestones, setEditMilestones] = useState<Milestone[]>([]);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState<string>('');
  const [newMilestoneDueDate, setNewMilestoneDueDate] = useState<string>('Week 2');
  const [loading, setLoading] = useState<boolean>(false);

  const toggleMilestone = async (period: InternshipPeriod, milestoneId: string) => {
    if (!isAdminOrLead) return;

    const currentMilestones = Array.isArray(period.milestones) ? period.milestones : [];
    const updatedMilestones = currentMilestones.map((m) =>
      m.id === milestoneId ? { ...m, completed: !m.completed } : m
    );

    try {
      await api.put(`/internship/${activeTeam?.teamId}/${period.id}`, {
        milestones: updatedMilestones,
      });
      onUpdate();
    } catch (err) {
      console.error('Failed to toggle milestone:', err);
    }
  };

  const openEditModal = (period: InternshipPeriod) => {
    setEditingPeriod(period);
    setEditMilestones(Array.isArray(period.milestones) ? [...period.milestones] : []);
  };

  const addMilestone = () => {
    if (!newMilestoneTitle.trim()) return;
    const newM: Milestone = {
      id: `m-${Date.now()}`,
      title: newMilestoneTitle.trim(),
      dueDate: newMilestoneDueDate,
      completed: false,
    };
    setEditMilestones([...editMilestones, newM]);
    setNewMilestoneTitle('');
  };

  const removeMilestone = (id: string) => {
    setEditMilestones(editMilestones.filter((m) => m.id !== id));
  };

  const saveMilestones = async () => {
    if (!editingPeriod) return;
    setLoading(true);
    try {
      await api.put(`/internship/${activeTeam?.teamId}/${editingPeriod.id}`, {
        milestones: editMilestones,
      });
      onUpdate();
      setEditingPeriod(null);
    } catch (err) {
      console.error('Failed to save milestones:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Program High-Level Scorecard */}
      <div className="glass-panel rounded-2xl p-6 relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider mb-1">
              <Trophy className="w-4 h-4 text-amber-400" /> 6-Month Engineering Apprenticeship
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Internship Growth & Milestone Progression
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Structured progressive curriculum tracking full-stack mastery, code reviews, architectural thinking, and capstone delivery.
            </p>
          </div>

          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex items-center gap-6 min-w-[260px]">
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase">Program Completion</div>
              <div className="text-2xl font-black text-indigo-300 mt-0.5">{stats.overallPercentage}%</div>
            </div>
            <div className="h-8 w-px bg-slate-800"></div>
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase">Milestones</div>
              <div className="text-sm font-mono text-slate-200 mt-1">
                {stats.completedMilestones} / {stats.totalMilestones} Completed
              </div>
            </div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="mt-5 h-2 w-full bg-slate-800/80 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-500"
            style={{ width: `${stats.overallPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* 6 Monthly Timeline Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {periods.map((period) => {
          const milestones = Array.isArray(period.milestones) ? period.milestones : [];
          const completedCount = milestones.filter((m) => m.completed).length;

          const getStatusStyle = (status: string) => {
            switch (status) {
              case 'COMPLETED':
                return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
              case 'IN_PROGRESS':
                return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30';
              default:
                return 'bg-slate-800/50 text-slate-400 border-slate-700/50';
            }
          };

          return (
            <div
              key={period.id}
              className="glass-card rounded-2xl p-5 border border-slate-800/80 flex flex-col justify-between bg-slate-900/60 transition-all"
            >
              <div>
                {/* Period Card Header */}
                <div className="flex items-center justify-between mb-3">
                  <span className="w-7 h-7 rounded-lg bg-slate-800 text-indigo-300 flex items-center justify-center text-xs font-bold font-mono">
                    M{period.monthNumber}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusStyle(
                        period.status
                      )}`}
                    >
                      {period.status.replace('_', ' ')}
                    </span>
                    {isAdminOrLead && (
                      <button
                        onClick={() => openEditModal(period)}
                        className="p-1 rounded-md text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition-colors"
                        title="Edit Milestones (Admin/Lead)"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-100 mb-1 leading-snug">
                  {period.monthTitle}
                </h3>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-4">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>
                    {format(new Date(period.startDate), 'MMM yyyy')} -{' '}
                    {format(new Date(period.endDate), 'MMM yyyy')}
                  </span>
                </div>

                {/* Progress bar per month */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                    <span>Progress</span>
                    <span className="text-slate-200 font-bold">{period.completionPercentage}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        period.completionPercentage === 100 ? 'bg-emerald-400' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${period.completionPercentage}%` }}
                    ></div>
                  </div>
                </div>

                {/* Milestones List */}
                <div className="space-y-2 mb-4">
                  {milestones.length === 0 ? (
                    <div className="text-xs text-slate-400 italic">No milestones defined yet.</div>
                  ) : (
                    milestones.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => toggleMilestone(period, m.id)}
                        className={`flex items-start gap-2.5 p-2 rounded-xl text-xs transition-all ${
                          isAdminOrLead ? 'cursor-pointer hover:bg-slate-800/60' : ''
                        } ${
                          m.completed
                            ? 'bg-emerald-950/20 text-emerald-300/90 border border-emerald-900/30 line-through opacity-75'
                            : 'bg-slate-950/60 text-slate-300 border border-slate-800/60'
                        }`}
                      >
                        {m.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <span className="leading-tight">{m.title}</span>
                          <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                            Target: {m.dueDate}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {isAdminOrLead && (
                <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-800/60 flex items-center justify-between">
                  <span>Click milestones to toggle status</span>
                  <span className="text-amber-400/80">Lead Edit Active</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit Milestones Modal */}
      {editingPeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">
                Edit {editingPeriod.monthTitle} Milestones
              </h3>
              <button
                onClick={() => setEditingPeriod(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {editMilestones.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-400 font-mono text-[11px]">
                      [{m.dueDate}]
                    </span>
                    <span>{m.title}</span>
                  </div>
                  <button
                    onClick={() => removeMilestone(m.id)}
                    className="text-slate-400 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="text-xs font-semibold text-slate-300">Add Milestone</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMilestoneTitle}
                  onChange={(e) => setNewMilestoneTitle(e.target.value)}
                  placeholder="e.g. Master React Hooks & Performance"
                  className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <select
                  value={newMilestoneDueDate}
                  onChange={(e) => setNewMilestoneDueDate(e.target.value)}
                  className="px-2 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
                >
                  <option value="Week 1">Week 1</option>
                  <option value="Week 2">Week 2</option>
                  <option value="Week 3">Week 3</option>
                  <option value="Week 4">Week 4</option>
                </select>
                <button
                  onClick={addMilestone}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => setEditingPeriod(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={saveMilestones}
                disabled={loading}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                {loading ? 'Saving...' : 'Save Milestones'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
