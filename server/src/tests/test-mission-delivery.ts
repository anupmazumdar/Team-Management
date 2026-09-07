import { prisma } from '../config/db.js';

async function runMissionDeliveryTest() {
  console.log('🎯 Running Mission Details, Acceptance, and On-Time Delivery Tests...');

  // 1. Find a test project and users
  const project = await prisma.project.findFirst({
    include: { team: { include: { members: { include: { user: true } } } } },
  });

  if (!project) throw new Error('No project found');

  const adminMember = project.team.members.find((m) => m.role === 'admin');
  const internMember = project.team.members.find((m) => m.role === 'member');
  const leadMember = project.team.members.find((m) => m.role === 'lead');

  if (!adminMember || !internMember || !leadMember) {
    throw new Error('Required members not found');
  }

  // 2. Create task with Mission Details & Deadline (Tomorrow)
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const task = await prisma.task.create({
    data: {
      teamId: project.teamId,
      projectId: project.id,
      title: 'Automated Mission & On-Time Delivery Verification Test',
      description: 'End-to-end integration test of acceptance and SLA metrics.',
      missionDetails: 'MISSION BRIEFING: Implement on-time SLA metrics, verify acceptance flow, and satisfy all unit criteria.',
      deadline: tomorrow,
      priority: 'HIGH',
      category: 'Backend',
      status: 'NOT_STARTED',
      createdById: adminMember.userId,
      assignedToId: internMember.userId,
      reviewerId: leadMember.userId,
      checklist: [
        { id: 'm1', text: 'Accept mission', completed: false },
        { id: 'm2', text: 'Deliver before SLA deadline', completed: false },
      ],
    },
  });

  console.log('✅ Created task with missionDetails:', task.missionDetails);
  console.log('   Task status:', task.status);

  // 3. Member Accepts Mission
  const acceptedAt = new Date();
  const acceptedTask = await prisma.task.update({
    where: { id: task.id },
    data: {
      status: 'IN_PROGRESS',
      acceptedAt,
      acceptedById: internMember.userId,
    },
  });

  if (acceptedTask.status !== 'IN_PROGRESS' || !acceptedTask.acceptedAt) {
    throw new Error('Mission acceptance failed!');
  }
  console.log('✅ Member accepted mission at:', acceptedTask.acceptedAt);
  console.log('   Task status updated to:', acceptedTask.status);

  // 4. Member Delivers Task Before Deadline
  const deliveredAt = new Date();
  const isOnTime = deliveredAt.getTime() <= task.deadline!.getTime();
  const deliveredTask = await prisma.task.update({
    where: { id: task.id },
    data: {
      status: 'SUBMITTED',
      submissionNote: 'Mission completed ahead of deadline with all tests passing.',
      deliveredAt,
      isOnTime,
    },
  });

  if (deliveredTask.status !== 'SUBMITTED' || deliveredTask.isOnTime !== true) {
    throw new Error('On-time delivery tracking failed!');
  }
  console.log('✅ Member delivered task on-time! deliveredAt:', deliveredTask.deliveredAt, 'isOnTime:', deliveredTask.isOnTime);

  // 5. Clean up test task
  await prisma.task.delete({ where: { id: task.id } });
  console.log('🧹 Cleaned up test task.');

  console.log('🎉 ALL MISSION ACCEPTANCE AND ON-TIME DELIVERY TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

runMissionDeliveryTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
