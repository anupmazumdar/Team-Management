import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Task } from '../types';
import { TaskCard } from '../components/tasks/TaskCard';
import {
  CheckSquare,
  PlayCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
} from 'lucide-react';

interface MyTasksPageProps {
  onSelectTask: (task: Task) => void;
}

export const MyTasksPage: React.FC<MyTasksPageProps> = ({ onSelectTask }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchMyTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tasks?assignedTo=me');
      setTasks(res.data || []);
    } catch (err) {
      console.error('Failed to load my tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTasks();
  }, [user?.id]);

  const filtered = tasks.filter((t) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'active') return t.status !== 'APPROVED';
    if (statusFilter === 'in-progress') return t.status === 'IN_PROGRESS';
    if (statusFilter === 'review') return t.status === 'SUBMITTED' || t.status === 'UNDER_REVIEW';
    if (statusFilter === 'changes') return t.status === 'CHANGES_REQUIRED';
    if (statusFilter === 'approved') return t.status === 'APPROVED';
    return true;
  });

  const stats = {
    total: tasks.length,
    inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    underReview: tasks.filter((t) => t.status === 'SUBMITTED' || t.status === 'UNDER_REVIEW').length,
    changesReq: tasks.filter((t) => t.status === 'CHANGES_REQUIRED').length,
    approved: tasks.filter((t) => t.status === 'APPROVED').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">My Tasks</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Tasks assigned to you. Advance from In Progress to Submitted for leadership review.
        </p>
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4 border border-slate-800">
          <div className="text-xs font-medium text-slate-400">Total Assigned</div>
          <div className="text-2xl font-black text-white mt-1">{stats.total}</div>
        </div>

        <div className="glass-card rounded-xl p-4 border border-blue-900/40 bg-blue-950/20">
          <div className="text-xs font-medium text-blue-300">In Progress</div>
          <div className="text-2xl font-black text-blue-400 mt-1">{stats.inProgress}</div>
        </div>

        <div className="glass-card rounded-xl p-4 border border-amber-900/40 bg-amber-950/20">
          <div className="text-xs font-medium text-amber-300">In Review Queue</div>
          <div className="text-2xl font-black text-amber-400 mt-1">{stats.underReview}</div>
        </div>

        <div className="glass-card rounded-xl p-4 border border-emerald-900/40 bg-emerald-950/20">
          <div className="text-xs font-medium text-emerald-300">Approved & Done</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">{stats.approved}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 text-xs">
        {[
          { id: 'all', label: 'All' },
          { id: 'active', label: 'Active Tasks' },
          { id: 'in-progress', label: 'In Progress' },
          { id: 'review', label: 'Under Review' },
          { id: 'changes', label: 'Changes Required' },
          { id: 'approved', label: 'Approved' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors ${
              statusFilter === tab.id
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Task Grid */}
      {filtered.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center text-xs text-slate-400 border border-slate-800">
          No tasks found under this filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((task) => (
            <TaskCard key={task.id} task={task} onSelect={onSelectTask} />
          ))}
        </div>
      )}
    </div>
  );
};
