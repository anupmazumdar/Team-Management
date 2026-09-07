import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Hustlex Workspace database seed...');

  // 1. Clean existing records (in reverse dependency order)
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.message.deleteMany();
  await prisma.taskReview.deleteMany();
  await prisma.taskComment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.internshipPeriod.deleteMany();
  await prisma.project.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned existing database records.');

  // 2. Hash default password
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 3. Create Users
  const alex = await prisma.user.create({
    data: {
      email: 'admin@hustlex.com',
      passwordHash,
      fullName: 'Alex Turner',
      title: 'VP of Engineering & Workspace Admin',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
  });

  const sarah = await prisma.user.create({
    data: {
      email: 'lead@hustlex.com',
      passwordHash,
      fullName: 'Sarah Chen',
      title: 'Senior Engineering Team Lead',
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    },
  });

  const devin = await prisma.user.create({
    data: {
      email: 'intern1@hustlex.com',
      passwordHash,
      fullName: 'Devin Patel',
      title: 'Full Stack Engineering Intern',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    },
  });

  const maya = await prisma.user.create({
    data: {
      email: 'intern2@hustlex.com',
      passwordHash,
      fullName: 'Maya Lin',
      title: 'Frontend UI/UX Intern',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    },
  });

  const rahul = await prisma.user.create({
    data: {
      email: 'intern3@hustlex.com',
      passwordHash,
      fullName: 'Rahul Sharma',
      title: 'Backend Systems Intern',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    },
  });

  console.log('👤 Created 5 sample users (Password123!)');

  // 4. Create Main Team
  const team = await prisma.team.create({
    data: {
      name: 'HustleX Core Engineering',
      slug: 'hustlex-core',
      description: 'Primary platform engineering workspace for high-velocity full-stack delivery and internship mentorship.',
      createdById: alex.id,
    },
  });

  console.log('🏢 Created Team: HustleX Core Engineering');

  // 5. Create Team Memberships (Dynamic Roles)
  await prisma.teamMember.createMany({
    data: [
      { teamId: team.id, userId: alex.id, role: 'admin' },
      { teamId: team.id, userId: sarah.id, role: 'lead' },
      { teamId: team.id, userId: devin.id, role: 'member' },
      { teamId: team.id, userId: maya.id, role: 'member' },
      { teamId: team.id, userId: rahul.id, role: 'member' },
    ],
  });

  console.log('👥 Assigned dynamic team roles (Alex=Admin, Sarah=Lead, Devin/Maya/Rahul=Members)');

  // 6. Create Projects
  const project1 = await prisma.project.create({
    data: {
      teamId: team.id,
      name: 'CRM & Team Workspace Platform',
      description: 'End-to-end task execution engine, verification state machine, and real-time project collaboration channels.',
      status: 'active',
      createdById: alex.id,
    },
  });

  const project2 = await prisma.project.create({
    data: {
      teamId: team.id,
      name: 'Mobile Client & Offline Sync',
      description: 'React Native companion app with local SQLite cache and optimistic synchronization.',
      status: 'active',
      createdById: sarah.id,
    },
  });

  console.log('📁 Created 2 Projects');

  // 7. Create Tasks Across All Verification Statuses
  const taskApproved = await prisma.task.create({
    data: {
      teamId: team.id,
      projectId: project1.id,
      title: 'Normalized PostgreSQL Schema & Prisma Migrations',
      description: 'Design normalized models for users, teams, projects, tasks, reviews, and activity logs. Ensure foreign key constraints and cascades are optimal.',
      missionDetails: '🎯 Mission Objective: Construct a bulletproof 12-table relational schema with strict foreign key integrity, index optimization, and dynamic per-team role join tables. Deliverables: Validated Prisma schema, seamless cloud Neon connection, and robust cascading delete constraints.',
      status: 'APPROVED',
      priority: 'HIGH',
      category: 'Backend',
      deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      acceptedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      acceptedById: devin.id,
      deliveredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 - 3 * 60 * 60 * 1000), // Delivered 3 hrs ahead of deadline!
      isOnTime: true,
      assignedToId: devin.id,
      reviewerId: alex.id,
      createdById: sarah.id,
      submissionNote: 'Completed all 12 models and verified db push with clean indexes.',
      checklist: [
        { id: 'c1', text: 'Design table relationships in DBML diagram', completed: true },
        { id: 'c2', text: 'Write Prisma schema with index attributes', completed: true },
        { id: 'c3', text: 'Execute migration against Neon cloud instance', completed: true },
      ],
    },
  });

  // Add historical review snapshot for the approved task!
  await prisma.taskReview.create({
    data: {
      taskId: taskApproved.id,
      reviewedByUserId: alex.id,
      reviewedByNameSnapshot: 'Alex Turner',
      reviewedByRoleSnapshot: 'admin',
      decision: 'APPROVED',
      comment: 'Exceptional database normalization and index planning. Schema is verified for high scale.',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  });

  const taskChangesRequired = await prisma.task.create({
    data: {
      teamId: team.id,
      projectId: project1.id,
      title: 'Audit Trail Export to CSV and JSON',
      description: 'Allow team leads to download full activity logs with date range and action filters.',
      status: 'CHANGES_REQUIRED',
      priority: 'MEDIUM',
      category: 'Backend',
      deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      assignedToId: maya.id,
      reviewerId: sarah.id,
      createdById: sarah.id,
      submissionNote: 'Added CSV generation route and tested with 500 rows.',
      checklist: [
        { id: 'c4', text: 'Stream large CSV files without memory spikes', completed: true },
        { id: 'c5', text: 'Sanitize cell formulas to prevent CSV injection', completed: false },
        { id: 'c6', text: 'Add unit tests for empty export sets', completed: false },
      ],
    },
  });

  // Add historical review snapshot for Changes Required
  await prisma.taskReview.create({
    data: {
      taskId: taskChangesRequired.id,
      reviewedByUserId: sarah.id,
      reviewedByNameSnapshot: 'Sarah Chen',
      reviewedByRoleSnapshot: 'lead',
      decision: 'CHANGES_REQUIRED',
      comment: 'Please sanitize CSV values against formula injection (escape leading =, +, -, @ characters) before approving.',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    },
  });

  const taskUnderReview = await prisma.task.create({
    data: {
      teamId: team.id,
      projectId: project1.id,
      title: 'Real-Time WebSocket Reconnect Protocol',
      description: 'Implement exponential backoff reconnect logic with client heartbeat and toast reconnection banners.',
      status: 'UNDER_REVIEW',
      priority: 'URGENT',
      category: 'Frontend',
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      assignedToId: devin.id,
      reviewerId: sarah.id,
      createdById: sarah.id,
      submissionNote: 'Tested reconnection behavior by killing Express dev server and restoring it. Heartbeat works reliably.',
      checklist: [
        { id: 'c7', text: 'Implement exponential backoff with jitter', completed: true },
        { id: 'c8', text: 'Add connection state toast indicator in UI', completed: true },
        { id: 'c9', text: 'Queue messages sent during offline window', completed: true },
      ],
    },
  });

  const taskSubmitted = await prisma.task.create({
    data: {
      teamId: team.id,
      projectId: project1.id,
      title: 'Implement JWT Refresh Rotation & Blacklist',
      description: 'Add short-lived access tokens with rotating refresh tokens stored securely with SHA-256 fingerprinting.',
      status: 'SUBMITTED',
      priority: 'HIGH',
      category: 'Security',
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      assignedToId: rahul.id,
      reviewerId: alex.id,
      createdById: alex.id,
      submissionNote: 'Ready for review! Added token rotation unit tests with 100% code coverage.',
      checklist: [
        { id: 'c10', text: 'Configure access token expiration to 15m', completed: true },
        { id: 'c11', text: 'Implement rotation on token refresh', completed: true },
        { id: 'c12', text: 'Add revocation endpoint on logout', completed: true },
      ],
    },
  });

  const taskInProgress = await prisma.task.create({
    data: {
      teamId: team.id,
      projectId: project1.id,
      title: 'Build Dynamic State Machine Stepper Component',
      description: 'Render interactive progression stepper with current status glow, legal next actions, and rejection indicators.',
      missionDetails: '🎯 Mission Objective: Develop the responsive State Machine Stepper visually signaling all 6 statuses and rejection cycle. Deliverables: React component, mobile-first responsiveness, and smooth state transition animations.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      category: 'Frontend',
      deadline: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      acceptedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      acceptedById: maya.id,
      assignedToId: maya.id,
      reviewerId: sarah.id,
      createdById: sarah.id,
      checklist: [
        { id: 'c13', text: 'Draft responsive horizontal & vertical stepper', completed: true },
        { id: 'c14', text: 'Integrate validation rules from backend stateMachine.ts', completed: false },
        { id: 'c15', text: 'Add smooth transition animations with Tailwind', completed: false },
      ],
    },
  });

  const taskNotStarted = await prisma.task.create({
    data: {
      teamId: team.id,
      projectId: project2.id,
      title: 'Configure Multi-Region S3 Bucket Backup',
      description: 'Set up cross-region replication for user-uploaded artifacts and asset previews with lifecycle retention rules.',
      missionDetails: '🎯 Mission Objective: Deploy cross-region S3 replication bucket architecture in us-west-2 with lifecycle archive rules. Deliverables: Terraform manifest, IAM replication policy, and backup recovery drill report.',
      status: 'NOT_STARTED',
      priority: 'LOW',
      category: 'DevOps',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      assignedToId: devin.id,
      reviewerId: alex.id,
      createdById: alex.id,
      checklist: [
        { id: 'c16', text: 'Create secondary backup bucket in us-west-2', completed: false },
        { id: 'c17', text: 'Configure Terraform replication rules', completed: false },
      ],
    },
  });

  console.log('✅ Created 6 Tasks across all 6 verification statuses with historical review snapshots');

  // 8. Create Comments on Tasks
  await prisma.taskComment.createMany({
    data: [
      {
        taskId: taskUnderReview.id,
        userId: devin.id,
        content: 'I verified reconnection on Chrome and Firefox. Ready for your review Sarah!',
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      },
      {
        taskId: taskUnderReview.id,
        userId: sarah.id,
        content: 'Reviewing this now Devin. Love the inclusion of the toast banners.',
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      },
      {
        taskId: taskChangesRequired.id,
        userId: sarah.id,
        content: 'Hey Maya, the CSV export works great for clean text, but please check the formula injection vulnerability.',
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      },
      {
        taskId: taskChangesRequired.id,
        userId: maya.id,
        content: 'Got it Sarah! Adding the regex sanitizer now and will move to In Progress once pushed.',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
    ],
  });

  console.log('💬 Created task discussion threads');

  // 9. Create 6-Month Internship Periods with Milestones
  const now = new Date();
  const internshipMonths = [
    {
      monthNumber: 1,
      monthTitle: 'Month 1: Orientation, Git & Architecture',
      startDate: new Date(now.getFullYear(), now.getMonth() - 2, 1),
      endDate: new Date(now.getFullYear(), now.getMonth() - 1, 0),
      completionPercentage: 100,
      status: 'COMPLETED',
      milestones: [
        { id: 'm1-1', title: 'Complete local workspace setup & Docker/Neon DB connections', completed: true, dueDate: 'Week 1' },
        { id: 'm1-2', title: 'Antigravity IDE & pair-programming hygiene review', completed: true, dueDate: 'Week 2' },
        { id: 'm1-3', title: 'First PR approved: Schema design & migrations', completed: true, dueDate: 'Week 4' },
      ],
    },
    {
      monthNumber: 2,
      monthTitle: 'Month 2: Frontend Engineering & State Machines',
      startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      endDate: new Date(now.getFullYear(), now.getMonth(), 0),
      completionPercentage: 75,
      status: 'IN_PROGRESS',
      milestones: [
        { id: 'm2-1', title: 'Master React TypeScript & Tailwind Design Systems', completed: true, dueDate: 'Week 1' },
        { id: 'm2-2', title: 'Implement finite state machine stepper with client validation', completed: true, dueDate: 'Week 2' },
        { id: 'm2-3', title: 'Responsive Kanban board with combinable filters', completed: false, dueDate: 'Week 4' },
      ],
    },
    {
      monthNumber: 3,
      monthTitle: 'Month 3: Backend APIs & Dynamic Per-Team Roles',
      startDate: new Date(now.getFullYear(), now.getMonth(), 1),
      endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      completionPercentage: 35,
      status: 'IN_PROGRESS',
      milestones: [
        { id: 'm3-1', title: 'Build live role verification middleware in Express', completed: true, dueDate: 'Week 1' },
        { id: 'm3-2', title: 'Member removal safety with mandatory open task reassignment', completed: false, dueDate: 'Week 2' },
        { id: 'm3-3', title: 'Reviewer snapshotting audit logging mechanism', completed: false, dueDate: 'Week 4' },
      ],
    },
    {
      monthNumber: 4,
      monthTitle: 'Month 4: Real-Time WebSockets & Team Chat',
      startDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      endDate: new Date(now.getFullYear(), now.getMonth() + 2, 0),
      completionPercentage: 0,
      status: 'UPCOMING',
      milestones: [
        { id: 'm4-1', title: 'Project chat channels with user @mentions & notifications', completed: false, dueDate: 'Week 2' },
        { id: 'm4-2', title: 'System-emitted activity events on verification milestones', completed: false, dueDate: 'Week 4' },
      ],
    },
    {
      monthNumber: 5,
      monthTitle: 'Month 5: Security Auditing & Review Pipelines',
      startDate: new Date(now.getFullYear(), now.getMonth() + 2, 1),
      endDate: new Date(now.getFullYear(), now.getMonth() + 3, 0),
      completionPercentage: 0,
      status: 'UPCOMING',
      milestones: [
        { id: 'm5-1', title: 'Automated E2E test suites for state machine transitions', completed: false, dueDate: 'Week 2' },
        { id: 'm5-2', title: 'Penetration testing & OWASP compliance check', completed: false, dueDate: 'Week 4' },
      ],
    },
    {
      monthNumber: 6,
      monthTitle: 'Month 6: Capstone Project & Leadership Transition',
      startDate: new Date(now.getFullYear(), now.getMonth() + 3, 1),
      endDate: new Date(now.getFullYear(), now.getMonth() + 4, 0),
      completionPercentage: 0,
      status: 'UPCOMING',
      milestones: [
        { id: 'm6-1', title: 'Full production release & multi-tenant verification', completed: false, dueDate: 'Week 2' },
        { id: 'm6-2', title: 'Capstone defense presentation to engineering council', completed: false, dueDate: 'Week 4' },
      ],
    },
  ];

  for (const period of internshipMonths) {
    await prisma.internshipPeriod.create({
      data: {
        teamId: team.id,
        monthNumber: period.monthNumber,
        monthTitle: period.monthTitle,
        startDate: period.startDate,
        endDate: period.endDate,
        completionPercentage: period.completionPercentage,
        status: period.status,
        milestones: period.milestones,
      },
    });
  }

  console.log('📅 Created 6-month internship timeline with interactive milestones');

  // 10. Create Real-Time Messages in Project Chat
  await prisma.message.createMany({
    data: [
      {
        projectId: project1.id,
        teamId: team.id,
        senderId: null,
        content: '🚀 Project "CRM & Team Workspace Platform" initialized by Alex Turner.',
        isSystem: true,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        projectId: project1.id,
        teamId: team.id,
        senderId: alex.id,
        content: 'Welcome everyone! Please review your assigned tasks and keep your internship milestone checklist updated.',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        projectId: project1.id,
        teamId: team.id,
        senderId: devin.id,
        content: 'Thanks Alex! I have completed the database schema and submitted the reconnection protocol for review.',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
      {
        projectId: project1.id,
        teamId: team.id,
        senderId: null,
        content: 'Devin Patel submitted "Real-Time WebSocket Reconnect Protocol" for review.',
        isSystem: true,
        createdAt: new Date(Date.now() - 90 * 60 * 1000),
      },
      {
        projectId: project1.id,
        teamId: team.id,
        senderId: sarah.id,
        content: 'Reviewing Devin\'s PR now. @maya let me know if you need help with the state machine stepper.',
        mentions: [maya.id],
        createdAt: new Date(Date.now() - 30 * 60 * 1000),
      },
    ],
  });

  console.log('💬 Created initial project chat and system messages');

  // 11. Create Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: devin.id,
        teamId: team.id,
        type: 'TASK_APPROVED',
        title: 'Task Approved!',
        message: 'Alex Turner (ADMIN) approved "Normalized PostgreSQL Schema & Prisma Migrations"',
        link: `/tasks/${taskApproved.id}`,
        isRead: false,
      },
      {
        userId: maya.id,
        teamId: team.id,
        type: 'CHANGES_REQUESTED',
        title: 'Changes Requested',
        message: 'Sarah Chen (LEAD) requested changes on "Audit Trail Export to CSV and JSON"',
        link: `/tasks/${taskChangesRequired.id}`,
        isRead: false,
      },
      {
        userId: sarah.id,
        teamId: team.id,
        type: 'TASK_SUBMITTED',
        title: 'Task Submitted for Review',
        message: 'Devin Patel submitted "Real-Time WebSocket Reconnect Protocol" for review.',
        link: `/tasks/${taskUnderReview.id}`,
        isRead: false,
      },
      {
        userId: maya.id,
        teamId: team.id,
        type: 'MENTION',
        title: 'Sarah Chen mentioned you in project chat',
        message: 'Sarah Chen mentioned you in CRM & Team Workspace Platform chat.',
        link: `/projects/${project1.id}?tab=chat`,
        isRead: true,
      },
    ],
  });

  console.log('🔔 Created notifications for team members');

  // 12. Create Activity Logs
  await prisma.activityLog.createMany({
    data: [
      {
        teamId: team.id,
        actorId: alex.id,
        action: 'TEAM_CREATED',
        details: { teamName: team.name },
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        teamId: team.id,
        actorId: alex.id,
        action: 'ROLE_UPDATED',
        details: {
          targetUserName: 'Sarah Chen',
          previousRole: 'member',
          newRole: 'lead',
        },
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },
      {
        teamId: team.id,
        projectId: project1.id,
        taskId: taskApproved.id,
        actorId: devin.id,
        action: 'STATUS_CHANGED',
        details: {
          previousStatus: 'IN_PROGRESS',
          newStatus: 'SUBMITTED',
          taskTitle: taskApproved.title,
        },
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        teamId: team.id,
        projectId: project1.id,
        taskId: taskApproved.id,
        actorId: alex.id,
        action: 'REVIEW_SUBMITTED',
        details: {
          decision: 'APPROVED',
          reviewerName: 'Alex Turner',
          reviewerRole: 'admin',
          taskTitle: taskApproved.title,
        },
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        teamId: team.id,
        projectId: project1.id,
        taskId: taskUnderReview.id,
        actorId: devin.id,
        action: 'STATUS_CHANGED',
        details: {
          previousStatus: 'IN_PROGRESS',
          newStatus: 'SUBMITTED',
          taskTitle: taskUnderReview.title,
        },
        createdAt: new Date(Date.now() - 90 * 60 * 1000),
      },
    ],
  });

  console.log('📜 Seeded append-only activity audit logs');
  console.log('✨ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
