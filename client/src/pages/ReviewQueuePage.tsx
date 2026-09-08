import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Task } from '../types';
import { ReviewModal } from '../components/tasks/ReviewModal';
import {
  ShieldCheck,
  CheckCircle2,
  User,
} from 'lucide-react';
import { format } from 'date-fns';

interface ReviewQueuePageProps {
  onSelectTask: (task: Task) => void;
}

export const ReviewQueuePage: React.FC<ReviewQueuePageProps> = ({ onSelectTask }) => {
  const { activeTeam, activeRole } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedReviewTask, setSelectedReviewTask] = useState<Task | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    if (!activeTeam) return;

    const loadReviewQueue = async () => {
      try {
        const res = await api.get('/tasks?reviewQueue=true');
        if (isMounted) {
          setTasks(res.data || []);
        }
      } catch (err) {
        console.error('Failed to load review queue:', err);
      }
    };

    loadReviewQueue();
    return () => {
      isMounted = false;
    };
  }, [activeTeam, refreshKey]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-6 bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" /> Verification Queue • {activeRole?.toUpperCase()} Panel
          </div>
          <h1 className="text-xl font-black text-white tracking-tight">
            Pending Task Submissions ({tasks.length})
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Tasks submitted by members awaiting code review, testing confirmation, or architectural approval.
          </p>
        </div>
      </div>

      {/* Queue List */}
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="glass-panel rounded-2xl p-12 text-center text-xs text-slate-400 border border-slate-800 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto opacity-70" />
            <div className="font-semibold text-slate-300">All submissions verified!</div>
            <p className="text-[11px]">There are no tasks currently awaiting review in the queue.</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="glass-panel rounded-2xl p-5 border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      task.status === 'SUBMITTED' ? 'badge-submitted' : 'badge-under-review'
                    }`}
                  >
                    {task.status.replace('_', ' ')}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-800 text-slate-300">
                    {task.category}
                  </span>
                  <span className="text-xs text-slate-400">• {task.project?.name}</span>
                </div>

                <h3
                  onClick={() => onSelectTask(task)}
                  className="text-base font-bold text-white hover:text-amber-300 cursor-pointer transition-colors line-clamp-1"
                >
                  {task.title}
                </h3>

                {task.submissionNote && (
                  <div className="text-xs text-slate-300 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 italic">
                    Note: "{task.submissionNote}"
                  </div>
                )}

                <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Assignee:</span>
                    <strong className="text-slate-200">{task.assignedTo?.fullName}</strong>
                  </div>
                  <span>•</span>
                  <span>Submitted: {format(new Date(task.updatedAt), 'MMM d, HH:mm')}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                <button
                  onClick={() => onSelectTask(task)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
                >
                  View Details
                </button>
                <button
                  onClick={() => setSelectedReviewTask(task)}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-600/30 flex items-center gap-1.5 transition-all"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Review Task</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Review Modal */}
      {selectedReviewTask && (
        <ReviewModal
          isOpen={!!selectedReviewTask}
          onClose={() => setSelectedReviewTask(null)}
          task={selectedReviewTask}
          onReviewSubmitted={() => setRefreshKey((prev) => prev + 1)}
        />
      )}
    </div>
  );
};
