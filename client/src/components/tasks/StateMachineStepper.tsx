import React from 'react';
import { TaskStatus } from '../../types';
import {
  CircleDashed,
  PlayCircle,
  Send,
  Eye,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

interface StateMachineStepperProps {
  currentStatus: TaskStatus;
}

export const StateMachineStepper: React.FC<StateMachineStepperProps> = ({ currentStatus }) => {
  const isChangesRequired = currentStatus === 'CHANGES_REQUIRED';

  const steps: { key: TaskStatus; label: string; icon: React.ElementType }[] = [
    { key: 'NOT_STARTED', label: 'Not Started', icon: CircleDashed },
    { key: 'IN_PROGRESS', label: 'In Progress', icon: PlayCircle },
    { key: 'SUBMITTED', label: 'Submitted', icon: Send },
    { key: 'UNDER_REVIEW', label: 'Under Review', icon: Eye },
    { key: 'APPROVED', label: 'Approved', icon: CheckCircle2 },
  ];

  const getStepIndex = (status: TaskStatus) => {
    switch (status) {
      case 'NOT_STARTED':
        return 0;
      case 'IN_PROGRESS':
        return 1;
      case 'SUBMITTED':
        return 2;
      case 'UNDER_REVIEW':
        return 3;
      case 'APPROVED':
        return 4;
      case 'CHANGES_REQUIRED':
        return 3; // branch off from under review
      default:
        return 0;
    }
  };

  const currentIndex = getStepIndex(currentStatus);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <span>Verification State Machine</span>
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
          <span className="text-slate-300 font-normal">Strict Server Enforced</span>
        </div>
        <div>
          {isChangesRequired ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" /> Changes Required (Review Rejected)
            </span>
          ) : currentStatus === 'APPROVED' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              <CheckCircle2 className="w-3.5 h-3.5" /> Approved & Verified
            </span>
          ) : (
            <span className="text-xs text-indigo-400 font-medium">
              Step {currentIndex + 1} of 5
            </span>
          )}
        </div>
      </div>

      {/* Primary Linear Stepper */}
      <div className="relative flex items-center justify-between">
        {/* Connecting background track */}
        <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-slate-800 rounded-full z-0"></div>

        {/* Progress track */}
        <div
          className={`absolute left-6 top-1/2 -translate-y-1/2 h-1 rounded-full transition-all duration-500 z-0 ${
            isChangesRequired ? 'bg-rose-500/60' : 'bg-gradient-to-r from-indigo-500 to-emerald-500'
          }`}
          style={{ width: `${(Math.min(currentIndex, 4) / 4) * 92}%` }}
        ></div>

        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isPassed = !isChangesRequired && idx < currentIndex;
          const isCurrent = !isChangesRequired && idx === currentIndex;

          return (
            <div key={step.key} className="relative z-10 flex flex-col items-center group">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCurrent
                    ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/30 shadow-lg shadow-indigo-500/50 scale-110'
                    : isPassed
                    ? 'bg-emerald-600/90 text-white'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div
                className={`mt-2 text-xs font-semibold text-center whitespace-nowrap ${
                  isCurrent
                    ? 'text-indigo-300 font-bold'
                    : isPassed
                    ? 'text-emerald-400'
                    : 'text-slate-400'
                }`}
              >
                {step.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Changes Required Rejection Cycle Display */}
      {isChangesRequired && (
        <div className="mt-5 p-3.5 rounded-xl bg-rose-950/30 border border-rose-900/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5 text-rose-300 font-medium">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              Reviewer requested modifications. The task cycle returns to{' '}
              <strong className="text-white font-bold">In Progress</strong> once work resumes.
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-rose-400 uppercase">
            <span>Under Review</span>
            <ArrowRight className="w-3.5 h-3.5" />
            <span className="text-rose-200 font-bold">Changes Required</span>
            <ArrowRight className="w-3.5 h-3.5" />
            <span className="text-amber-300 font-bold">In Progress</span>
          </div>
        </div>
      )}
    </div>
  );
};
