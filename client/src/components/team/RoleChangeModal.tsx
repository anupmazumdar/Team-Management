import React, { useState } from 'react';
import { api } from '../../services/api';
import { TeamMemberWithStats, TeamRole } from '../../types';
import { X, Shield, AlertTriangle } from 'lucide-react';

interface RoleChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: TeamMemberWithStats;
  teamId: string;
  onRoleChanged: () => void;
}

export const RoleChangeModal: React.FC<RoleChangeModalProps> = ({
  isOpen,
  onClose,
  member,
  teamId,
  onRoleChanged,
}) => {
  const [selectedRole, setSelectedRole] = useState<TeamRole>(member.role);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.put(`/teams/${teamId}/members/${member.userId}/role`, {
        newRole: selectedRole,
      });

      onRoleChanged();
      onClose();
    } catch (err: any) {
      console.error('Failed to change role:', err);
      setError(err.response?.data?.error || 'Failed to update member role');
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
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Update Member Role</h2>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            {[
              {
                id: 'member',
                name: 'Member',
                desc: 'Can execute assigned tasks, submit work for review, and participate in project chat.',
              },
              {
                id: 'lead',
                name: 'Team Lead',
                desc: 'Can create projects, assign tasks, review/approve submissions, and update internship milestones.',
              },
              {
                id: 'admin',
                name: 'Workspace Admin',
                desc: 'Full workspace governance, role modifications, member invitations, and leadership transfers.',
              },
            ].map((roleOption) => (
              <label
                key={roleOption.id}
                className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                  selectedRole === roleOption.id
                    ? 'bg-indigo-950/40 border-indigo-500/80 text-white ring-2 ring-indigo-500/20'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={roleOption.id}
                  checked={selectedRole === roleOption.id}
                  onChange={() => setSelectedRole(roleOption.id as TeamRole)}
                  className="mt-1 accent-indigo-500"
                />
                <div>
                  <div className="text-xs font-bold text-slate-200">{roleOption.name}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    {roleOption.desc}
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-900/40 flex items-start gap-2.5 text-xs text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              This action takes effect immediately and writes an immutable record to the audit trail.
            </div>
          </div>

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
              disabled={loading || selectedRole === member.role}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Save Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
