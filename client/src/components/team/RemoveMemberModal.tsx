import React, { useState } from 'react';
import { api } from '../../services/api';
import { TeamMemberWithStats } from '../../types';
import { X, UserMinus, AlertTriangle } from 'lucide-react';

interface RemoveMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: TeamMemberWithStats;
  otherMembers: TeamMemberWithStats[];
  teamId: string;
  onMemberRemoved: () => void;
}

export const RemoveMemberModal: React.FC<RemoveMemberModalProps> = ({
  isOpen,
  onClose,
  member,
  otherMembers,
  teamId,
  onMemberRemoved,
}) => {
  const [reassignToUserId, setReassignToUserId] = useState<string>(otherMembers[0]?.userId || '');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const hasOpenTasks = member.stats.pending > 0;

  const handleRemove = async (e: React.FormEvent) => {
    e.preventDefault();

    if (hasOpenTasks && !reassignToUserId) {
      setError('Please select an active team member to reassign their open tasks to.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.post(`/teams/${teamId}/members/${member.userId}/remove`, {
        reassignToUserId: hasOpenTasks ? reassignToUserId : undefined,
      });

      onMemberRemoved();
      onClose();
    } catch (err: any) {
      console.error('Failed to remove member:', err);
      setError(err.response?.data?.error || 'Failed to remove member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <UserMinus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Remove Team Member</h2>
              <p className="text-xs text-slate-400">{member.user.fullName}</p>
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

        <form onSubmit={handleRemove} className="p-6 space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            Are you sure you want to remove <strong>{member.user.fullName}</strong> from this team? They will immediately lose access to team resources and chat channels.
          </p>

          {/* Open Task Reassignment Prompt */}
          {hasOpenTasks ? (
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/60 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Mandatory Open Task Reassignment</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                This member currently has <strong className="text-white">{member.stats.pending} open task(s)</strong> in progress or under review. Please select a replacement active member to reassign them to:
              </p>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Reassign Open Tasks To:
                </label>
                <select
                  value={reassignToUserId}
                  onChange={(e) => setReassignToUserId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  required
                >
                  {otherMembers.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.user.fullName} ({m.role.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
              No open tasks currently assigned to this member. Safe to remove cleanly.
            </div>
          )}

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
              className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Confirm Removal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
