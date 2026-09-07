const BASE_URL = 'http://localhost:5000/api';

async function request(endpoint: string, options: any = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${msg}`);
}

async function runLiveE2ETests() {
  console.log('🚀 Starting Comprehensive Live API & State Machine E2E Test Suite...\n');

  // 1. Healthcheck
  console.log('--- 1. Healthcheck & Server Liveness ---');
  const health = await request('/health');
  assert(health.status === 200 && health.data?.status === 'ok', 'Server is running and healthy');

  // 2. Authentication (Admin, Lead, Intern)
  console.log('\n--- 2. Authentication & Dynamic Per-Team Roles ---');
  const adminAuth = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@hustlex.com', password: 'Password123!' }),
  });
  assert(adminAuth.status === 200 && !!adminAuth.data?.token, 'Admin login succeeded');
  const adminToken = adminAuth.data.token;
  const teamId = adminAuth.data.teams[0].teamId;
  assert(adminAuth.data.teams[0].role === 'admin', 'Admin role verified in active team');

  const leadAuth = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'lead@hustlex.com', password: 'Password123!' }),
  });
  assert(leadAuth.status === 200 && leadAuth.data.teams[0].role === 'lead', 'Lead login succeeded with live role "lead"');
  const leadToken = leadAuth.data.token;

  const internAuth = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'intern1@hustlex.com', password: 'Password123!' }),
  });
  assert(internAuth.status === 200 && internAuth.data.teams[0].role === 'member', 'Intern login succeeded with live role "member"');
  const internToken = internAuth.data.token;
  const internId = internAuth.data.user.id;

  // 3. Task Creation by Intern
  console.log('\n--- 3. Task Lifecycle: Creation ---');
  const projectsRes = await request('/projects', {
    headers: { Authorization: `Bearer ${internToken}`, 'x-team-id': teamId },
  });
  assert(projectsRes.status === 200 && projectsRes.data.length > 0, 'Fetched active projects');
  const projectId = projectsRes.data[0].id;

  const createTaskRes = await request('/tasks', {
    method: 'POST',
    headers: { Authorization: `Bearer ${internToken}`, 'x-team-id': teamId },
    body: JSON.stringify({
      projectId,
      title: 'E2E Live Verification Engine Task',
      description: 'Test task advancing through the full verification state machine.',
      priority: 'HIGH',
      category: 'Backend',
      assignedToId: internId,
      reviewerId: leadAuth.data.user.id,
      checklist: [
        { id: 'e2e-1', text: 'Run automated assertions', completed: true },
        { id: 'e2e-2', text: 'Verify immutable snapshots', completed: true },
      ],
    }),
  });
  assert(createTaskRes.status === 201 && createTaskRes.data?.status === 'NOT_STARTED', 'Created task in NOT_STARTED state');
  const taskId = createTaskRes.data.id;

  // 4. Illegal State Jump Rejection (Server Enforced)
  console.log('\n--- 4. State Machine: Reject Illegal Transitions ---');
  const illegalJump = await request(`/tasks/${taskId}/status`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${internToken}`, 'x-team-id': teamId },
    body: JSON.stringify({ newStatus: 'APPROVED' }),
  });
  assert(illegalJump.status === 400, 'Server rejected illegal jump NOT_STARTED -> APPROVED with HTTP 400');
  console.log(`   (Rejection reason: "${illegalJump.data?.error}")`);

  // 5. Legal Forward Progression: NOT_STARTED -> IN_PROGRESS
  console.log('\n--- 5. State Machine: Progress to IN_PROGRESS ---');
  const startWork = await request(`/tasks/${taskId}/status`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${internToken}`, 'x-team-id': teamId },
    body: JSON.stringify({ newStatus: 'IN_PROGRESS' }),
  });
  assert(startWork.status === 200 && startWork.data?.status === 'IN_PROGRESS', 'Task transitioned to IN_PROGRESS');

  // 6. Submission: IN_PROGRESS -> SUBMITTED with Note
  console.log('\n--- 6. State Machine: Submission with Reviewer Note ---');
  const submitTask = await request(`/tasks/${taskId}/status`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${internToken}`, 'x-team-id': teamId },
    body: JSON.stringify({
      newStatus: 'SUBMITTED',
      submissionNote: 'Implementation complete and tested with 100% assertions passing.',
    }),
  });
  assert(submitTask.status === 200 && submitTask.data?.status === 'SUBMITTED', 'Task transitioned to SUBMITTED');

  // 7. Self-Approval Prevention
  console.log('\n--- 7. State Machine: Self-Approval Prevention ---');
  const selfApprove = await request(`/tasks/${taskId}/review`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${internToken}`, 'x-team-id': teamId },
    body: JSON.stringify({
      decision: 'APPROVED',
      comment: 'Attempting to self-approve my own task as an intern.',
    }),
  });
  assert(selfApprove.status === 403, 'Server blocked intern self-approval with HTTP 403');
  console.log(`   (Rejection reason: "${selfApprove.data?.error}")`);

  // 8. Review by Designated Lead with Permanent Snapshot
  console.log('\n--- 8. Review & Historical Snapshotting by Lead ---');
  const leadReview = await request(`/tasks/${taskId}/review`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${leadToken}`, 'x-team-id': teamId },
    body: JSON.stringify({
      decision: 'APPROVED',
      comment: 'Verified and approved! State transitions, assertions, and checklist verified.',
    }),
  });
  assert(leadReview.status === 200 && leadReview.data?.updatedTask?.status === 'APPROVED', 'Lead approved task -> terminal APPROVED state');
  const reviewRecord = leadReview.data.reviewRecord;
  assert(reviewRecord.reviewedByNameSnapshot === 'Sarah Chen', 'Reviewer name snapshot accurately preserved: "Sarah Chen"');
  assert(reviewRecord.reviewedByRoleSnapshot === 'lead', 'Reviewer role snapshot accurately preserved: "lead"');

  // 9. Scoped Task Discussion Comments
  console.log('\n--- 9. Scoped Discussion Thread ---');
  const commentRes = await request(`/comments/${taskId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${internToken}`, 'x-team-id': teamId },
    body: JSON.stringify({ content: 'Thank you Sarah for the prompt review and approval!' }),
  });
  assert(commentRes.status === 201 && !!commentRes.data?.id, 'Comment appended to task discussion thread');

  // 10. Internship Progress & Milestones
  console.log('\n--- 10. 6-Month Internship Progress Roadmap ---');
  const internRoadmap = await request(`/internship/${teamId}`, {
    headers: { Authorization: `Bearer ${leadToken}`, 'x-team-id': teamId },
  });
  assert(internRoadmap.status === 200 && internRoadmap.data?.periods?.length === 6, 'Retrieved all 6 internship periods');
  const period2 = internRoadmap.data.periods[1];

  const updateMilestone = await request(`/internship/${teamId}/${period2.id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${leadToken}`, 'x-team-id': teamId },
    body: JSON.stringify({
      completionPercentage: 85,
      status: 'IN_PROGRESS',
    }),
  });
  assert(updateMilestone.status === 200 && updateMilestone.data?.completionPercentage === 85, 'Updated Month 2 progress to 85%');

  // 11. Role Governance & Append-Only Audit Trail
  console.log('\n--- 11. Role Update & Append-Only Audit Trail ---');
  const memberList = await request(`/teams/${teamId}`, {
    headers: { Authorization: `Bearer ${adminToken}`, 'x-team-id': teamId },
  });
  const targetMember = memberList.data.members.find((m: any) => m.user.email === 'intern3@hustlex.com');

  const roleChange = await request(`/teams/${teamId}/members/${targetMember.userId}/role`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}`, 'x-team-id': teamId },
    body: JSON.stringify({ newRole: 'lead' }),
  });
  assert(roleChange.status === 200 && roleChange.data?.role === 'lead', 'Admin updated Rahul Sharma to role: "lead"');

  const auditLogs = await request(`/activity/${teamId}?limit=10`, {
    headers: { Authorization: `Bearer ${adminToken}`, 'x-team-id': teamId },
  });
  assert(auditLogs.status === 200 && auditLogs.data?.logs?.length > 0, 'Audit trail fetched');
  const roleLog = auditLogs.data.logs.find((l: any) => l.action === 'ROLE_UPDATED');
  assert(!!roleLog, 'Append-only audit log contains ROLE_UPDATED record');
  const reviewLog = auditLogs.data.logs.find((l: any) => l.action === 'REVIEW_SUBMITTED');
  assert(!!reviewLog, 'Append-only audit log contains REVIEW_SUBMITTED record');

  console.log('\n🎉 ALL 11 END-TO-END VERIFICATION SUITES PASSED FLAWLESSLY!\n');
}

runLiveE2ETests().catch((err) => {
  console.error('E2E Test Execution Error:', err);
  process.exit(1);
});
