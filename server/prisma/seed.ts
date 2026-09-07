import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Hustlex Workspace database clean seed (Admin Only)...');

  // 1. Purge all records to guarantee a clean slate
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

  console.log('🧹 Cleaned all dummy demo records.');

  // 2. Hash default admin password
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 3. Create SINGLE Admin User
  const admin = await prisma.user.create({
    data: {
      email: 'admin@hustlex.com',
      passwordHash,
      fullName: 'Alex Turner',
      title: 'VP of Engineering & Workspace Admin',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      authProvider: 'local',
    },
  });

  console.log(`👤 Created Admin user: ${admin.fullName} (${admin.email})`);

  // 4. Create Primary Production Team
  const team = await prisma.team.create({
    data: {
      name: 'HustleX Core Engineering',
      slug: 'hustlex-core',
      description: 'Central engineering and product workspace.',
      createdById: admin.id,
    },
  });

  console.log(`🏢 Created Primary Team: ${team.name} (${team.slug})`);

  // 5. Add Admin to Team as Workspace Admin
  await prisma.teamMember.create({
    data: {
      teamId: team.id,
      userId: admin.id,
      role: 'admin',
    },
  });

  // 6. Create Default Project
  const project = await prisma.project.create({
    data: {
      teamId: team.id,
      name: 'Core Roadmap & Deliverables',
      description: 'Primary project for mission directives, sprint milestones, and production deliverables.',
      createdById: admin.id,
      status: 'ACTIVE',
    },
  });

  console.log(`📁 Created Primary Project: ${project.name}`);

  // 7. Log workspace creation activity
  await prisma.activityLog.create({
    data: {
      team: { connect: { id: team.id } },
      actor: { connect: { id: admin.id } },
      action: 'TEAM_CREATED',
      details: {
        description: 'Clean workspace initialized with Admin account.',
      },
    },
  });

  console.log('✨ Production Clean Seed Complete! Only Admin and core workspace preserved.');
}

main()
  .catch((e) => {
    console.error('❌ Clean seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
