import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { TeamMemberWithStats } from '../types';
import { RoleChangeModal } from '../components/team/RoleChangeModal';
import { RemoveMemberModal } from '../components/team/RemoveMemberModal';
import {
  UserPlus,
  Shield,
  Briefcase,
  UserMinus,
  X,
} from 'lucide-react';

export const TeamPage: React.FC = () => {
  const { activeTeam, activeRole, user } = useAuth();
  const [members, setMembers] = useState<TeamMemberWithStats[]>([]);
  const [selectedForRoleChange, setSelectedForRoleChange] = useState<TeamMemberWithStats | null>(null);
  const [selectedForRemoval, setSelectedForRemoval] = useState<TeamMemberWithStats | null>(null);
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'lead' | 'member'>('member');
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const isAdmin = activeRole === 'admin';
  const isAdminOrLead = activeRole === 'admin' || activeRole === 'lead';

  useEffect(() => {
    let isMounted = true;
    if (!activeTeam) return;

    const loadTeamMembers = async () => {
      try {
        const res = await api.get(`/teams/${activeTeam.teamId}`);
        if (isMounted) {
          setMembers(res.data?.members || []);
        }
      } catch (err: any) {
        console.error('Failed to load team members:', err);
        if (isMounted) {
          setError(err.response?.data?.error || 'Failed to load members');
        }
      }
    };

    loadTeamMembers();
    return () => {
      isMounted = false;
    };
  }, [activeTeam, refreshKey]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      await api.post(`/teams/${activeTeam?.teamId}/invite`, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setShowInviteModal(false);
      setInviteEmail('');
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to invite member');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Team Members & Governance</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Dynamic per-team roles, approval metrics, and member management.
          </p>
        </div>

        {isAdminOrLead && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 flex items-center gap-1.5 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Member</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* Member Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Member</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Assigned Tasks</th>
                <th className="py-3.5 px-4">Completed</th>
                <th className="py-3.5 px-4">Pending</th>
                <th className="py-3.5 px-4">Approval Rate</th>
                <th className="py-3.5 px-4">On-Time SLA</th>
                {isAdmin && <th className="py-3.5 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {members.map((m) => {
                const isMe = m.userId === user?.id;

                const getRoleBadge = (role: string) => {
                  switch (role) {
                    case 'admin':
                      return (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                          <Shield className="w-3 h-3" /> ADMIN
                        </span>
                      );
                    case 'lead':
                      return (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                          <Briefcase className="w-3 h-3" /> LEAD
                        </span>
                      );
                    default:
                      return (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                          MEMBER
                        </span>
                      );
                  }
                };

                return (
                  <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={m.user.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-700"
                        />
                        <div>
                          <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                            <span>{m.user.fullName}</span>
                            {isMe && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-normal">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">{m.user.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">{getRoleBadge(m.role)}</td>

                    <td className="py-3.5 px-4 font-mono font-medium text-slate-200">
                      {m.stats.assigned}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-emerald-400 font-medium">
                      {m.stats.completed}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-amber-400 font-medium">
                      {m.stats.pending}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-200">
                          {m.stats.approvalRate}%
                        </span>
                        <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500"
                            style={{ width: `${m.stats.approvalRate}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-indigo-300">
                          {m.stats.onTimeRate ?? 100}%
                        </span>
                        <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500"
                            style={{ width: `${m.stats.onTimeRate ?? 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>

                    {isAdmin && (
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedForRoleChange(m)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                          >
                            Change Role
                          </button>
                          {!isMe && (
                            <button
                              onClick={() => setSelectedForRemoval(m)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                              title="Remove Member"
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Change Modal */}
      {selectedForRoleChange && (
        <RoleChangeModal
          isOpen={!!selectedForRoleChange}
          onClose={() => setSelectedForRoleChange(null)}
          member={selectedForRoleChange}
          teamId={activeTeam!.teamId}
          onRoleChanged={() => setRefreshKey((k) => k + 1)}
        />
      )}

      {/* Remove Member Modal with Mandatory Task Reassignment */}
      {selectedForRemoval && (
        <RemoveMemberModal
          isOpen={!!selectedForRemoval}
          onClose={() => setSelectedForRemoval(null)}
          member={selectedForRemoval}
          otherMembers={members.filter((m) => m.userId !== selectedForRemoval.userId)}
          teamId={activeTeam!.teamId}
          onMemberRemoved={() => setRefreshKey((k) => k + 1)}
        />
      )}

      {/* Add / Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-indigo-400" /> Add Team Member
              </h3>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">User Email *</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="e.g. intern@hustlex.com"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Initial Role *</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="member">Member</option>
                  <option value="lead">Team Lead</option>
                  {isAdmin && <option value="admin">Workspace Admin</option>}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
