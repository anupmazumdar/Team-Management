import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Task, TaskComment, TaskReview } from '../types';
import { StateMachineStepper } from '../components/tasks/StateMachineStepper';
import { ReviewModal } from '../components/tasks/ReviewModal';
import {
  ArrowLeft,
  Calendar,
  CheckSquare,
  Clock,
  MessageSquare,
  ShieldCheck,
  User,
  Send,
  PlayCircle,
  AlertTriangle,
  CheckCircle2,
  FileText,
  RotateCcw,
  Target,
} from 'lucide-react';
import { format, isPast } from 'date-fns';

interface TaskDetailPageProps {
  taskId: string;
  onBack: () => void;
}

export const TaskDetailPage: React.FC<TaskDetailPageProps> = ({ taskId, onBack }) => {
  const { user, activeRole } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState<string>('');
  const [submissionNote, setSubmissionNote] = useState<string>('');
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTaskDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/tasks/${taskId}`);
      setTask(res.data);
      setComments(res.data.comments || []);
    } catch (err: any) {
      console.error('Failed to load task:', err);
      setError(err.response?.data?.error || 'Failed to load task');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskDetails();
  }, [taskId]);

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-slate-400">
        Loading task details & verification state...
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="p-8 text-center space-y-3">
        <div className="text-sm font-semibold text-rose-400">{error || 'Task not found'}</div>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-200"
        >
          ← Back to Tasks
        </button>
      </div>
    );
  }

  const isAssignee = task.assignedToId === user?.id;
  const isReviewer = task.reviewerId === user?.id;
  const isAdminOrLead = activeRole === 'admin' || activeRole === 'lead';

  // Toggle checklist item
  const handleToggleChecklist = async (itemId: string, currentCompleted: boolean) => {
    try {
      const res = await api.put(`/tasks/${task.id}/checklist/${itemId}`, {
        completed: !currentCompleted,
      });
      setTask(res.data);
    } catch (err) {
      console.error('Checklist update failed:', err);
    }
  };

  // Accept Mission
  const handleAcceptTask = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await api.post(`/tasks/${task.id}/accept`);
      setTask(res.data);
      await fetchTaskDetails();
    } catch (err: any) {
      console.error('Accept task failed:', err);
      setError(err.response?.data?.error || 'Failed to accept task');
    } finally {
      setActionLoading(false);
    }
  };

  // State machine transition
  const handleTransitionStatus = async (newStatus: string, note?: string) => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await api.put(`/tasks/${task.id}/status`, {
        newStatus,
        submissionNote: note,
      });
      setTask(res.data);
      setShowSubmitModal(false);
      await fetchTaskDetails();
    } catch (err: any) {
      console.error('Transition failed:', err);
      setError(err.response?.data?.error || 'Failed to update task state');
    } finally {
      setActionLoading(false);
    }
  };

  // Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const res = await api.post(`/comments/${task.id}`, {
        content: newComment.trim(),
      });
      setComments((prev) => [...prev, res.data]);
      setNewComment('');
    } catch (err) {
      console.error('Failed to post comment:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Task Board
        </button>

        {/* Dynamic Action Buttons based on live role & status */}
        <div className="flex items-center gap-2.5">
          {/* Transition: NOT_STARTED -> IN_PROGRESS via Mission Acceptance */}
          {task.status === 'NOT_STARTED' && (isAssignee || isAdminOrLead) && (
            <button
              onClick={handleAcceptTask}
              disabled={actionLoading}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              <Target className="w-4 h-4" />
              <span>Accept Mission & Start Work</span>
            </button>
          )}

          {/* Transition: IN_PROGRESS -> SUBMITTED */}
          {task.status === 'IN_PROGRESS' && (isAssignee || isAdminOrLead) && (
            <button
              onClick={() => setShowSubmitModal(true)}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-600/30 transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Deliver / Submit for Review</span>
            </button>
          )}

          {/* Review Action: SUBMITTED or UNDER_REVIEW -> APPROVED / CHANGES_REQUIRED */}
          {(task.status === 'SUBMITTED' || task.status === 'UNDER_REVIEW') &&
            (isReviewer || isAdminOrLead) && (
              <button
                onClick={() => setShowReviewModal(true)}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-amber-600/30 transition-all"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Review & Verify</span>
              </button>
            )}

          {/* Transition: CHANGES_REQUIRED -> IN_PROGRESS */}
          {task.status === 'CHANGES_REQUIRED' && (isAssignee || isAdminOrLead) && (
            <button
              onClick={() => handleTransitionStatus('IN_PROGRESS')}
              disabled={actionLoading}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-amber-600/30 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Resume Work on Changes</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* State Machine Stepper */}
      <StateMachineStepper currentStatus={task.status} />

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Details, Mission Briefing, Checklist, Reviews */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title & Description Box */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                  {task.category}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  {task.priority} Priority
                </span>
                <span className="text-xs text-slate-400 ml-auto">
                  Project: <strong className="text-slate-200">{task.project?.name}</strong>
                </span>
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">{task.title}</h1>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
              {task.description}
            </p>

            {task.submissionNote && (
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                <div className="font-semibold text-purple-300 mb-1 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5" /> Latest Submission Note
                </div>
                <div className="text-slate-300 italic">"{task.submissionNote}"</div>
              </div>
            )}
          </div>

          {/* Mission Details & Operational Directives */}
          <div className="glass-panel rounded-2xl p-6 border border-indigo-900/50 bg-indigo-950/15 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-400" /> Mission Directives & Deliverables
              </h2>
              {task.acceptedAt ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Mission Accepted
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Awaiting Acceptance
                </span>
              )}
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
              {task.missionDetails ? (
                task.missionDetails
              ) : (
                <span className="text-slate-400 italic">
                  Standard mission assignment. Please follow the task description, checklist milestones, and deadline for on-time delivery.
                </span>
              )}
            </div>

            {task.acceptedAt && (
              <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-1 border-t border-slate-800/60">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Accepted by assignee on:</span>
                <strong className="text-slate-200 font-mono">
                  {format(new Date(task.acceptedAt), 'MMM d, yyyy HH:mm')}
                </strong>
              </div>
            )}
          </div>

          {/* Interactive Checklist */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-3">
              <CheckSquare className="w-4 h-4 text-indigo-400" /> Acceptance Checklist
            </h2>

            <div className="space-y-2">
              {task.checklist?.length === 0 ? (
                <div className="text-xs text-slate-400 italic">No checklist items defined.</div>
              ) : (
                task.checklist.map((item) => (
                  <label
                    key={item.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      item.completed
                        ? 'bg-emerald-950/20 border-emerald-900/40 text-slate-400 line-through'
                        : 'bg-slate-950 border-slate-800/80 text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => handleToggleChecklist(item.id, item.completed)}
                      className="mt-0.5 accent-indigo-600 rounded"
                    />
                    <span className="leading-relaxed">{item.text}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Historical Reviews Timeline with Snapshot Columns */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-amber-400" /> Historical Review & Approval Snapshots
            </h2>

            <div className="space-y-3">
              {!task.reviews || task.reviews.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800/60">
                  No review submissions recorded yet. When a review is performed, permanent name and role snapshots are stored here.
                </div>
              ) : (
                task.reviews.map((rev) => {
                  const isApproved = rev.decision === 'APPROVED';
                  return (
                    <div
                      key={rev.id}
                      className={`p-4 rounded-xl border text-xs space-y-2 ${
                        isApproved
                          ? 'bg-emerald-950/20 border-emerald-800/40'
                          : 'bg-rose-950/20 border-rose-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isApproved ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-rose-400" />
                          )}
                          <span
                            className={`font-bold uppercase text-[11px] ${
                              isApproved ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {rev.decision.replace('_', ' ')}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {format(new Date(rev.timestamp), 'MMM d, yyyy HH:mm')}
                        </span>
                      </div>

                      <p className="text-slate-200 leading-relaxed pl-6">
                        "{rev.comment}"
                      </p>

                      <div className="pl-6 pt-1 text-[11px] text-slate-400 flex items-center gap-2">
                        <span>Reviewed by:</span>
                        <strong className="text-slate-200">{rev.reviewedByNameSnapshot}</strong>
                        <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono text-[10px] uppercase">
                          Role Snapshot: {rev.reviewedByRoleSnapshot}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Metadata & Task Comments Thread */}
        <div className="space-y-6">
          {/* Metadata Card */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-3.5 text-xs">
            <div className="font-semibold text-slate-300 text-xs uppercase tracking-wider pb-2 border-b border-slate-800">
              Task Details
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Assignee</span>
              {task.assignedTo ? (
                <div className="flex items-center gap-2">
                  <img
                    src={task.assignedTo.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'}
                    alt=""
                    className="w-6 h-6 rounded-full"
                  />
                  <span className="font-semibold text-slate-200">{task.assignedTo.fullName}</span>
                </div>
              ) : (
                <span className="text-slate-400 italic">Unassigned</span>
              )}
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Designated Reviewer</span>
              {task.reviewer ? (
                <div className="flex items-center gap-2">
                  <img
                    src={task.reviewer.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'}
                    alt=""
                    className="w-6 h-6 rounded-full"
                  />
                  <span className="font-semibold text-slate-200">{task.reviewer.fullName}</span>
                </div>
              ) : (
                <span className="text-slate-400 italic">None</span>
              )}
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Deadline & SLA</span>
              <span className="font-mono text-slate-200">
                {task.deadline ? format(new Date(task.deadline), 'MMMM d, yyyy') : 'No deadline'}
              </span>
            </div>

            {/* Delivery & SLA Tracking */}
            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-slate-400 block mb-1">Delivery Status</span>
              {task.deliveredAt ? (
                <div className="space-y-1">
                  <div className="font-mono text-[11px] text-slate-300">
                    Delivered: {format(new Date(task.deliveredAt), 'MMM d, yyyy HH:mm')}
                  </div>
                  {task.isOnTime !== null && (
                    <div>
                      {task.isOnTime ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Delivered On-Time (SLA Met)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          <AlertTriangle className="w-3 h-3 text-rose-400" />
                          Delivered Past Deadline
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ) : task.deadline ? (
                <div>
                  {isPast(new Date(task.deadline)) && task.status !== 'APPROVED' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                      <AlertTriangle className="w-3 h-3 text-rose-400" />
                      Overdue (Immediate Delivery Needed)
                    </span>
                  ) : (
                    <span className="text-[11px] text-blue-300 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> In Delivery Window
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-slate-400 italic">Pending delivery</span>
              )}
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Created By</span>
              <span className="text-slate-200">{task.createdBy?.fullName}</span>
            </div>
          </div>

          {/* Task Discussion Thread (Separate from team chat) */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col h-[420px]">
            <div className="font-semibold text-slate-300 text-xs uppercase tracking-wider pb-2 border-b border-slate-800 flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-400" /> Discussion Thread
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-3">
              {comments.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs text-center">
                  No comments yet. Post feedback or questions scoped to this task.
                </div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-indigo-300">{c.user.fullName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {format(new Date(c.createdAt), 'MMM d, HH:mm')}
                      </span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">{c.content}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddComment} className="pt-2 border-t border-slate-800 flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={!newComment.trim()}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Submission Note Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-purple-400" /> Submit Task for Review
            </h3>
            <p className="text-xs text-slate-300">
              Provide summary notes or deliverables for the reviewer before transitioning this task to{' '}
              <strong className="text-purple-300">Submitted</strong> status:
            </p>

            <textarea
              value={submissionNote}
              onChange={(e) => setSubmissionNote(e.target.value)}
              placeholder="e.g. Implemented all acceptance criteria, verified locally, and attached documentation..."
              rows={3}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleTransitionStatus('SUBMITTED', submissionNote)}
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30"
              >
                {actionLoading ? 'Submitting...' : 'Confirm Submission'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <ReviewModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          task={task}
          onReviewSubmitted={() => fetchTaskDetails()}
        />
      )}
    </div>
  );
};
