import { validateStateTransition, TaskStatus } from '../utils/stateMachine.js';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

console.log('🧪 Starting Task Verification State Machine Validation Tests...\n');

// Test 1: Legal Forward Progression
console.log('--- Test Suite 1: Legal Forward Transitions ---');
const t1 = validateStateTransition('NOT_STARTED', 'IN_PROGRESS', {
  userId: 'user-assignee',
  userRole: 'member',
  assignedToId: 'user-assignee',
});
assert(t1.valid, 'Assignee can transition NOT_STARTED -> IN_PROGRESS');

const t2 = validateStateTransition('IN_PROGRESS', 'SUBMITTED', {
  userId: 'user-assignee',
  userRole: 'member',
  assignedToId: 'user-assignee',
});
assert(t2.valid, 'Assignee can transition IN_PROGRESS -> SUBMITTED');

const t3 = validateStateTransition('SUBMITTED', 'UNDER_REVIEW', {
  userId: 'user-reviewer',
  userRole: 'lead',
  reviewerId: 'user-reviewer',
});
assert(t3.valid, 'Reviewer can transition SUBMITTED -> UNDER_REVIEW');

const t4 = validateStateTransition('UNDER_REVIEW', 'APPROVED', {
  userId: 'user-reviewer',
  userRole: 'lead',
  reviewerId: 'user-reviewer',
  assignedToId: 'user-assignee',
});
assert(t4.valid, 'Lead Reviewer can transition UNDER_REVIEW -> APPROVED');

// Test 2: Legal Rejection and Resumption Cycle
console.log('\n--- Test Suite 2: Rejection and Resumption Cycle ---');
const t5 = validateStateTransition('UNDER_REVIEW', 'CHANGES_REQUIRED', {
  userId: 'user-reviewer',
  userRole: 'lead',
  reviewerId: 'user-reviewer',
  assignedToId: 'user-assignee',
});
assert(t5.valid, 'Reviewer can transition UNDER_REVIEW -> CHANGES_REQUIRED');

const t6 = validateStateTransition('CHANGES_REQUIRED', 'IN_PROGRESS', {
  userId: 'user-assignee',
  userRole: 'member',
  assignedToId: 'user-assignee',
});
assert(t6.valid, 'Assignee can resume work CHANGES_REQUIRED -> IN_PROGRESS');

// Test 3: Illegal Status Jumps (Must Be Rejected)
console.log('\n--- Test Suite 3: Illegal Jumps (Must Reject) ---');
const t7 = validateStateTransition('NOT_STARTED', 'APPROVED', {
  userId: 'user-admin',
  userRole: 'admin',
});
assert(!t7.valid, 'Illegal jump NOT_STARTED -> APPROVED is rejected');

const t8 = validateStateTransition('IN_PROGRESS', 'APPROVED', {
  userId: 'user-admin',
  userRole: 'admin',
});
assert(!t8.valid, 'Illegal jump IN_PROGRESS -> APPROVED is rejected (must go through Submitted)');

const t9 = validateStateTransition('APPROVED', 'IN_PROGRESS', {
  userId: 'user-admin',
  userRole: 'admin',
});
assert(!t9.valid, 'Transition out of terminal APPROVED status is rejected');

// Test 4: Self-Approval Prevention
console.log('\n--- Test Suite 4: Self-Approval Prevention ---');
const t10 = validateStateTransition('UNDER_REVIEW', 'APPROVED', {
  userId: 'user-assignee',
  userRole: 'member',
  assignedToId: 'user-assignee',
  reviewerId: 'user-reviewer',
});
assert(!t10.valid, 'Assignee cannot self-approve their own task');

// Test 5: Unauthorized Member Review Prevention
console.log('\n--- Test Suite 5: Unauthorized Reviewer Prevention ---');
const t11 = validateStateTransition('UNDER_REVIEW', 'APPROVED', {
  userId: 'random-member',
  userRole: 'member',
  assignedToId: 'user-assignee',
  reviewerId: 'user-reviewer',
});
assert(!t11.valid, 'Non-reviewer member cannot approve someone else\'s task');

console.log('\n🎉 ALL 11 STATE MACHINE VALIDATION TESTS PASSED PERFECTLY!\n');
