import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ActivityLog } from '../types';
import {
  History,
  ShieldAlert,
  ShieldCheck,
  PlayCircle,
  Plus,
  UserCheck,
  UserMinus,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';

export const ActivityLogsPage: React.FC = () => {
  const { activeTeam } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchLogs = async () => {
    if (!activeTeam) return;
    setLoading(true);
    try {
      const res = await api.get(
        `/activity/${activeTeam.teamId}?action=${selectedAction}&limit=100`
      );
      setLogs(res.data?.logs || []);
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [activeTeam?.teamId, selectedAction]);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'ROLE_UPDATED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            ROLE UPDATED
          </span>
        );
      case 'REVIEW_SUBMITTED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
            REVIEW SUBMITTED
          </span>
        );
      case 'STATUS_CHANGED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
            STATUS CHANGED
          </span>
        );
      case 'MEMBER_REMOVED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
            MEMBER REMOVED
          </span>
        );
      case 'MEMBER_ADDED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            MEMBER ADDED
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
            {action.replace('_', ' ')}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Audit & Activity Trail</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Append-only historical ledger of state machine transitions, role updates, and approvals.
          </p>
        </div>

        {/* Action Filter */}
        <select
          value={selectedAction}
          onChange={(e) => setSelectedAction(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
        >
          <option value="all">All Audit Actions</option>
          <option value="ROLE_UPDATED">Role Updates</option>
          <option value="REVIEW_SUBMITTED">Reviews & Approvals</option>
          <option value="STATUS_CHANGED">Status Transitions</option>
          <option value="TASK_CREATED">Task Creations</option>
          <option value="MEMBER_REMOVED">Member Removals</option>
          <option value="MEMBER_ADDED">Member Additions</option>
        </select>
      </div>

      {/* Logs Timeline */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden divide-y divide-slate-800/60">
        {logs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No audit logs recorded under this category.
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="p-4 hover:bg-slate-800/40 transition-colors flex items-start justify-between gap-4"
            >
              <div className="flex items-start gap-3.5">
                <img
                  src={log.actor.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-700 shrink-0 mt-0.5"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-200 text-xs">{log.actor.fullName}</span>
                    {getActionBadge(log.action)}
                    {log.task && (
                      <span className="text-xs text-indigo-300 font-semibold">
                        • {log.task.title}
                      </span>
                    )}
                  </div>

                  {/* Details Render */}
                  <div className="text-xs text-slate-300 leading-relaxed">
                    {log.action === 'ROLE_UPDATED' && (
                      <span>
                        Updated role for <strong>{log.details.targetUserName}</strong> from{' '}
                        <code className="text-amber-400 font-mono text-[11px]">{log.details.previousRole}</code> to{' '}
                        <code className="text-emerald-400 font-mono text-[11px]">{log.details.newRole}</code>.
                      </span>
                    )}

                    {log.action === 'REVIEW_SUBMITTED' && (
                      <span>
                        Decision: <strong className="text-white">{log.details.decision}</strong>. Comment:{' '}
                        <em>"{log.details.comment}"</em> (Snapshot Role:{' '}
                        <code className="text-slate-400 font-mono text-[11px]">
                          {log.details.reviewerRole}
                        </code>
                        ).
                      </span>
                    )}

                    {log.action === 'STATUS_CHANGED' && (
                      <span>
                        Moved state from <code className="text-slate-400">{log.details.previousStatus}</code> to{' '}
                        <code className="text-indigo-400">{log.details.newStatus}</code>
                        {log.details.submissionNote && ` (Note: "${log.details.submissionNote}")`}.
                      </span>
                    )}

                    {log.action === 'MEMBER_REMOVED' && (
                      <span>
                        Removed member <strong>{log.details.removedUserName}</strong>.
                        {log.details.reassignedTo && ` Tasks reassigned to replacement member.`}
                      </span>
                    )}

                    {!['ROLE_UPDATED', 'REVIEW_SUBMITTED', 'STATUS_CHANGED', 'MEMBER_REMOVED'].includes(
                      log.action
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right text-[11px] text-slate-400 font-mono shrink-0">
                {format(new Date(log.createdAt), 'MMM d, yyyy HH:mm:ss')}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
