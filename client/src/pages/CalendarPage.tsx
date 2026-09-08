import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Task } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isPast,
  addMonths,
  subMonths,
} from 'date-fns';

interface CalendarPageProps {
  onSelectTask: (task: Task) => void;
}

export const CalendarPage: React.FC<CalendarPageProps> = ({ onSelectTask }) => {
  const { activeTeam } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  useEffect(() => {
    let isMounted = true;
    if (!activeTeam) return;

    const fetchTasks = async () => {
      try {
        const res = await api.get('/tasks');
        if (isMounted) {
          setTasks(res.data || []);
        }
      } catch (err) {
        console.error('Failed to load tasks for calendar:', err);
      }
    };

    fetchTasks();

    return () => {
      isMounted = false;
    };
  }, [activeTeam]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Deadlines Calendar</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Visual roadmap of task delivery milestones and verification deadlines.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl p-1">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-slate-200 px-2 min-w-[110px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        {/* Days Header */}
        <div className="grid grid-cols-7 bg-slate-950 border-b border-slate-800 text-center py-2.5 text-[11px] font-bold text-slate-400 uppercase">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Days Matrix */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-800/60 bg-slate-950/40">
          {daysInMonth.map((day) => {
            const dayTasks = tasks.filter(
              (t) => t.deadline && isSameDay(new Date(t.deadline), day)
            );

            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={day.toISOString()}
                className={`min-h-[110px] p-2 transition-colors ${
                  isToday ? 'bg-indigo-950/20' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-xs font-mono font-semibold ${
                      isToday
                        ? 'w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center'
                        : 'text-slate-400'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  {dayTasks.length > 0 && (
                    <span className="text-[10px] font-mono text-slate-400">
                      {dayTasks.length} task{dayTasks.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  {dayTasks.map((t) => {
                    const isApproved = t.status === 'APPROVED';
                    const isOverdue = !isApproved && isPast(day);

                    return (
                      <div
                        key={t.id}
                        onClick={() => onSelectTask(t)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-medium truncate cursor-pointer transition-all hover:scale-[1.02] ${
                          isApproved
                            ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40'
                            : isOverdue
                            ? 'bg-rose-950/40 text-rose-300 border border-rose-800/40'
                            : 'bg-indigo-950/40 text-indigo-300 border border-indigo-800/40'
                        }`}
                        title={`${t.title} (${t.status})`}
                      >
                        {t.title}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
