import React from 'react';
import { Task } from '../../types';
import {
  Calendar,
  CheckSquare,
  MessageSquare,
  ShieldCheck,
  User,
  Paperclip,
  Target,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { format, isPast } from 'date-fns';

interface TaskCardProps {
  task: Task;
  onSelect: (task: Task) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onSelect }) => {
  const checklist = Array.isArray(task.checklist) ? task.checklist : [];
  const completedCount = checklist.filter((item) => item.completed).length;
  const totalChecklist = checklist.length;

  const isOverdue = task.deadline && isPast(new Date(task.deadline)) && task.status !== 'APPROVED';

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'MEDIUM':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      default:
        return 'bg-slate-700/30 text-slate-300 border-slate-700/50';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NOT_STARTED':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold badge-not-started">Not Started</span>;
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold badge-in-progress">In Progress</span>;
      case 'SUBMITTED':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold badge-submitted">Submitted</span>;
      case 'UNDER_REVIEW':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold badge-under-review">Under Review</span>;
      case 'APPROVED':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold badge-approved">Approved</span>;
      case 'CHANGES_REQUIRED':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold badge-changes-required">Changes Req.</span>;
      default:
        return null;
    }
  };

  return (
    <div
      onClick={() => onSelect(task)}
      className="glass-card rounded-xl p-4 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 group border border-slate-800/80 bg-slate-900/60"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5">
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getPriorityStyle(
              task.priority
            )}`}
          >
            {task.priority}
          </span>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-800 text-slate-400">
            {task.category}
          </span>
          {task.missionDetails && (
            <span
              title="Mission Briefing Included"
              className="p-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center"
            >
              <Target className="w-2.5 h-2.5" />
            </span>
          )}
        </div>
        {getStatusBadge(task.status)}
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-1 mb-1">
        {task.title}
      </h3>

      {/* Description Snippet */}
      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-3">
        {task.description}
      </p>

      {/* Checklist Progress Bar */}
      {totalChecklist > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span className="flex items-center gap-1 font-medium">
              <CheckSquare className="w-3 h-3 text-indigo-400" />
              Checklist
            </span>
            <span className="font-mono text-slate-300">
              {completedCount}/{totalChecklist}
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                completedCount === totalChecklist ? 'bg-emerald-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${(completedCount / totalChecklist) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Bottom Footer Info */}
      <div className="pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
        {/* Assignee & Reviewer Avatars */}
        <div className="flex items-center gap-2">
          {task.assignedTo ? (
            <div className="flex items-center gap-1.5" title={`Assignee: ${task.assignedTo.fullName}`}>
              <img
                src={task.assignedTo.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'}
                alt={task.assignedTo.fullName}
                className="w-5 h-5 rounded-full object-cover ring-1 ring-slate-700"
              />
              <span className="text-[11px] text-slate-300 max-w-[80px] truncate">
                {task.assignedTo.fullName.split(' ')[0]}
              </span>
            </div>
          ) : (
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <User className="w-3 h-3" /> Unassigned
            </span>
          )}

          {task.reviewer && (
            <div
              className="flex items-center gap-1 pl-1 border-l border-slate-800 text-[11px] text-amber-400/80"
              title={`Reviewer: ${task.reviewer.fullName}`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span className="max-w-[70px] truncate">{task.reviewer.fullName.split(' ')[0]}</span>
            </div>
          )}
        </div>

        {/* Deadline or Meta */}
        <div className="flex items-center gap-2">
          {task.deliveredAt ? (
            task.isOnTime ? (
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-0.5"
                title="Delivered within deadline"
              >
                <CheckCircle2 className="w-2.5 h-2.5" /> On-Time
              </span>
            ) : (
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-0.5"
                title="Delivered past deadline"
              >
                <AlertTriangle className="w-2.5 h-2.5" /> Late
              </span>
            )
          ) : task.acceptedAt && task.status === 'IN_PROGRESS' ? (
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-0.5"
              title="Accepted and in progress"
            >
              <Target className="w-2.5 h-2.5" /> Accepted
            </span>
          ) : null}

          {task._count && task._count.comments > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-slate-400">
              <MessageSquare className="w-3 h-3" /> {task._count.comments}
            </span>
          )}

          {task.deadline && (
            <span
              className={`flex items-center gap-1 text-[11px] font-medium ${
                isOverdue ? 'text-rose-400 font-semibold' : 'text-slate-400'
              }`}
            >
              <Calendar className="w-3 h-3" />
              {format(new Date(task.deadline), 'MMM d')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
