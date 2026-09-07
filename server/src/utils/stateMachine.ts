export type TaskStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'CHANGES_REQUIRED';

export const VALID_STATUSES: TaskStatus[] = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'CHANGES_REQUIRED',
];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  CHANGES_REQUIRED: 'Changes Required',
};

// Legal forward and backward state transitions
export const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  NOT_STARTED: ['IN_PROGRESS'],
  IN_PROGRESS: ['SUBMITTED'],
  SUBMITTED: ['UNDER_REVIEW', 'IN_PROGRESS'], // can retract back to IN_PROGRESS if needed
  UNDER_REVIEW: ['APPROVED', 'CHANGES_REQUIRED', 'IN_PROGRESS'],
  CHANGES_REQUIRED: ['IN_PROGRESS'],
  APPROVED: [], // terminal verified state
};

export interface StateTransitionContext {
  userId: string;
  userRole: 'admin' | 'lead' | 'member';
  assignedToId?: string | null;
  reviewerId?: string | null;
}

export function validateStateTransition(
  currentStatus: TaskStatus,
  newStatus: TaskStatus,
  context: StateTransitionContext
): { valid: boolean; reason?: string } {
  // Check if current and new statuses are valid
  if (!VALID_STATUSES.includes(newStatus)) {
    return { valid: false, reason: `Invalid status: "${newStatus}". Must be one of: ${VALID_STATUSES.join(', ')}` };
  }

  if (currentStatus === newStatus) {
    return { valid: true };
  }

  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(newStatus)) {
    return {
      valid: false,
      reason: `Illegal state transition from "${STATUS_LABELS[currentStatus]}" to "${STATUS_LABELS[newStatus]}". Allowed transitions: ${allowed.map(s => STATUS_LABELS[s]).join(', ') || 'None'}.`,
    };
  }

  const { userId, userRole, assignedToId, reviewerId } = context;
  const isAssignee = assignedToId === userId;
  const isReviewer = reviewerId === userId;
  const isAdminOrLead = userRole === 'admin' || userRole === 'lead';

  // Specific role and actor permission checks:
  if (newStatus === 'APPROVED' || newStatus === 'CHANGES_REQUIRED') {
    // Only a reviewer, lead, or admin can approve or request changes
    if (!isAdminOrLead && !isReviewer) {
      return {
        valid: false,
        reason: 'Only the designated reviewer, team lead, or admin can approve or request changes on this task.',
      };
    }

    // Assignee cannot approve their own work unless they are admin/lead overriding
    if (isAssignee && !isAdminOrLead) {
      return {
        valid: false,
        reason: 'Assignees cannot self-approve their own submitted tasks.',
      };
    }
  }

  if (currentStatus === 'NOT_STARTED' && newStatus === 'IN_PROGRESS') {
    if (!isAssignee && !isAdminOrLead) {
      return {
        valid: false,
        reason: 'Only the assigned member or team leadership can start progress on this task.',
      };
    }
  }

  if (currentStatus === 'IN_PROGRESS' && newStatus === 'SUBMITTED') {
    if (!isAssignee && !isAdminOrLead) {
      return {
        valid: false,
        reason: 'Only the assigned member or team leadership can submit this task for review.',
      };
    }
  }

  return { valid: true };
}
