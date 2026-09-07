import React, { useState } from 'react';
import { api } from '../../services/api';
import { Task } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Info,
} from 'lucide-react';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  onReviewSubmitted: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  task,
  onReviewSubmitted,
}) => {
  const { user, activeRole } = useAuth();
  const [decision, setDecision] = useState<'APPROVED' | 'CHANGES_REQUIRED'>('APPROVED');
  const [comment, setComment] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setError('A review comment is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.post(`/tasks/${task.id}/review`, {
        decision,
        comment: comment.trim(),
      });

      onReviewSubmitted();
      onClose();
    } catch (err: any) {
      console.error('Failed to submit review:', err);
      setError(err.response?.data?.error || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Review & Verification</h2>
              <p className="text-xs text-slate-400 line-clamp-1">{task.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Submission Note Reference if present */}
          {task.submissionNote && (
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <div className="font-semibold text-slate-300 mb-0.5">Assignee Submission Note:</div>
              <div className="text-slate-400 italic">"{task.submissionNote}"</div>
            </div>
          )}

          {/* Decision Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Review Decision *</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDecision('APPROVED')}
                className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                  decision === 'APPROVED'
                    ? 'bg-emerald-950/40 border-emerald-500/80 text-emerald-300 ring-2 ring-emerald-500/20 shadow-lg shadow-emerald-950/50'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
                <div>
                  <div className="text-xs font-bold text-white">Approve Task</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Mark verified & completed</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDecision('CHANGES_REQUIRED')}
                className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                  decision === 'CHANGES_REQUIRED'
                    ? 'bg-rose-950/40 border-rose-500/80 text-rose-300 ring-2 ring-rose-500/20 shadow-lg shadow-rose-950/50'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
                <div>
                  <div className="text-xs font-bold text-white">Request Changes</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Cycle back to In Progress</div>
                </div>
              </button>
            </div>
          </div>

          {/* Feedback Comment */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Review Feedback / Instructions *
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                decision === 'APPROVED'
                  ? 'Great work! Code meets all acceptance criteria and passes security checks...'
                  : 'Please resolve the following before approval: 1)... 2)...'
              }
              rows={3}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          {/* Snapshot Attribution Notice */}
          <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-900/60 flex items-start gap-2.5 text-xs text-indigo-300">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong>Permanent Historical Snapshot:</strong> Your current name (
              <span className="text-white font-semibold">{user?.fullName}</span>) and role (
              <span className="text-white font-semibold">{activeRole?.toUpperCase()}</span>) will be snapshot
              permanently with this record in the audit trail.
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition-all disabled:opacity-50 ${
                decision === 'APPROVED'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                  : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
              }`}
            >
              {loading ? 'Submitting...' : decision === 'APPROVED' ? 'Confirm Approval' : 'Submit Changes Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
