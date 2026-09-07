export type TeamRole = 'admin' | 'lead' | 'member';

export type TaskStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'CHANGES_REQUIRED';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface User {
  id: string;
  email: string;
  fullName: string;
  title?: string;
  avatarUrl?: string;
}

export interface TeamMemberInfo {
  teamId: string;
  teamName: string;
  teamSlug: string;
  role: TeamRole;
  joinedAt: string;
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  description?: string;
  currentUserRole?: TeamRole;
  members?: TeamMemberWithStats[];
  stats?: {
    memberCount: number;
    projectCount: number;
    taskCount: number;
  };
}

export interface TeamMemberWithStats {
  id: string;
  userId: string;
  user: User;
  role: TeamRole;
  joinedAt: string;
  stats: {
    assigned: number;
    completed: number;
    pending: number;
    approvalRate: number;
    onTimeRate?: number;
  };
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'archived' | 'completed';
  createdAt: string;
  createdBy?: User;
  taskCount?: number;
  completedCount?: number;
  inProgressCount?: number;
  progressPercentage?: number;
  messageCount?: number;
  tasks?: Task[];
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface TaskReview {
  id: string;
  taskId: string;
  reviewedByUserId: string;
  reviewedByNameSnapshot: string;
  reviewedByRoleSnapshot: string;
  decision: 'APPROVED' | 'CHANGES_REQUIRED';
  comment: string;
  timestamp: string;
  reviewedByUser?: User;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: User;
}

export interface Attachment {
  id: string;
  taskId?: string;
  messageId?: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  uploader?: User;
}

export interface Task {
  id: string;
  projectId: string;
  teamId: string;
  title: string;
  description: string;
  missionDetails?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  category: string;
  deadline?: string | null;
  acceptedAt?: string | null;
  acceptedById?: string | null;
  deliveredAt?: string | null;
  isOnTime?: boolean | null;
  assignedToId?: string | null;
  assignedTo?: User | null;
  reviewerId?: string | null;
  reviewer?: User | null;
  createdById: string;
  createdBy?: User;
  checklist: ChecklistItem[];
  submissionNote?: string | null;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string };
  reviews?: TaskReview[];
  comments?: TaskComment[];
  attachments?: Attachment[];
  _count?: {
    comments: number;
    reviews: number;
    attachments: number;
  };
}

export interface Message {
  id: string;
  projectId: string;
  teamId: string;
  senderId?: string | null;
  sender?: User | null;
  content: string;
  isSystem: boolean;
  mentions: string[];
  createdAt: string;
  attachments?: Attachment[];
}

export interface Notification {
  id: string;
  userId: string;
  teamId: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  teamId: string;
  projectId?: string | null;
  taskId?: string | null;
  actorId: string;
  actor: User;
  action: string;
  details: Record<string, any>;
  createdAt: string;
  project?: { id: string; name: string };
  task?: { id: string; title: string };
}

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string;
}

export interface InternshipPeriod {
  id: string;
  teamId: string;
  monthNumber: number;
  monthTitle: string;
  startDate: string;
  endDate: string;
  milestones: Milestone[];
  completionPercentage: number;
  status: 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED';
}
