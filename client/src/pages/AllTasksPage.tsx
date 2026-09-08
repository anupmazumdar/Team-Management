import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Task, Project, TeamMemberWithStats, TaskStatus } from '../types';
import { TaskCard } from '../components/tasks/TaskCard';
import { TaskModal } from '../components/tasks/TaskModal';
import {
  Plus,
  LayoutGrid,
  List,
  Search,
  CheckCircle2,
  PlayCircle,
  CircleDashed,
  Send,
  Eye,
  AlertTriangle,
} from 'lucide-react';

interface AllTasksPageProps {
  onSelectTask: (task: Task) => void;
}

export const AllTasksPage: React.FC<AllTasksPageProps> = ({ onSelectTask }) => {
  const { activeTeam } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<TeamMemberWithStats[]>([]);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  // Filters
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    if (!activeTeam) return;

    const loadTasksAndFilters = async () => {
      try {
        const [tasksRes, projectsRes, teamRes] = await Promise.all([
          api.get('/tasks'),
          api.get('/projects'),
          api.get(`/teams/${activeTeam.teamId}`),
        ]);

        if (isMounted) {
          setTasks(tasksRes.data || []);
          setProjects(projectsRes.data || []);
          setMembers(teamRes.data?.members || []);
        }
      } catch (err) {
        console.error('Failed to load tasks:', err);
      }
    };

    loadTasksAndFilters();

    return () => {
      isMounted = false;
    };
  }, [activeTeam, refreshKey]);

  // Apply Client-Side Combinable Filters
  const filteredTasks = tasks.filter((task) => {
    if (selectedProject !== 'all' && task.projectId !== selectedProject) return false;
    if (selectedPriority !== 'all' && task.priority !== selectedPriority) return false;
    if (selectedCategory !== 'all' && task.category !== selectedCategory) return false;
    if (selectedAssignee !== 'all' && task.assignedToId !== selectedAssignee) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }
    return true;
  });

  const columns: { status: TaskStatus; label: string; icon: React.ElementType; color: string }[] = [
    { status: 'NOT_STARTED', label: 'Not Started', icon: CircleDashed, color: 'text-slate-400' },
    { status: 'IN_PROGRESS', label: 'In Progress', icon: PlayCircle, color: 'text-blue-400' },
    { status: 'SUBMITTED', label: 'Submitted', icon: Send, color: 'text-purple-400' },
    { status: 'UNDER_REVIEW', label: 'Under Review', icon: Eye, color: 'text-amber-400' },
    { status: 'CHANGES_REQUIRED', label: 'Changes Req.', icon: AlertTriangle, color: 'text-rose-400' },
    { status: 'APPROVED', label: 'Approved', icon: CheckCircle2, color: 'text-emerald-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Task Management</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Full verification state workflow across active projects.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === 'list'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden md:inline">List</span>
            </button>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Combinable Filters Bar */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-800 flex flex-wrap items-center gap-3 text-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Project filter */}
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
        >
          <option value="all">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* Category filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
        >
          <option value="all">All Categories</option>
          <option value="Frontend">Frontend</option>
          <option value="Backend">Backend</option>
          <option value="QA & Testing">QA & Testing</option>
          <option value="Design & UX">Design & UX</option>
          <option value="DevOps">DevOps</option>
          <option value="Security">Security</option>
        </select>

        {/* Priority filter */}
        <select
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
        >
          <option value="all">All Priorities</option>
          <option value="URGENT">Urgent</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        {/* Assignee filter */}
        <select
          value={selectedAssignee}
          onChange={(e) => setSelectedAssignee(e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
        >
          <option value="all">All Assignees</option>
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.user.fullName}
            </option>
          ))}
        </select>

        {(selectedProject !== 'all' ||
          selectedPriority !== 'all' ||
          selectedCategory !== 'all' ||
          selectedAssignee !== 'all' ||
          searchQuery) && (
          <button
            onClick={() => {
              setSelectedProject('all');
              setSelectedPriority('all');
              setSelectedCategory('all');
              setSelectedAssignee('all');
              setSearchQuery('');
            }}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium ml-auto"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Main Board / List */}
      {viewMode === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-6 pt-1 items-start">
          {columns.map((col) => {
            const Icon = col.icon;
            const colTasks = filteredTasks.filter((t) => t.status === col.status);

            return (
              <div
                key={col.status}
                className="bg-slate-900/50 rounded-2xl p-3.5 border border-slate-800/80 flex flex-col w-[290px] min-w-[290px] shrink-0"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-2 py-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${col.color}`} />
                    <span className="text-xs font-bold text-slate-200">{col.label}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-bold text-slate-400 font-mono">
                    {colTasks.length}
                  </span>
                </div>

                {/* Column Task Cards */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[70vh]">
                  {colTasks.length === 0 ? (
                    <div className="h-24 border border-dashed border-slate-800 rounded-xl flex items-center justify-center text-[11px] text-slate-400">
                      No tasks
                    </div>
                  ) : (
                    colTasks.map((task) => (
                      <TaskCard key={task.id} task={task} onSelect={onSelectTask} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden divide-y divide-slate-800/60">
          {filteredTasks.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No tasks match your filter criteria.
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onSelectTask(task)}
                className="p-4 flex items-center justify-between gap-4 hover:bg-slate-800/40 cursor-pointer transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                      {task.category}
                    </span>
                    <span className="text-xs text-slate-400">• {task.project?.name}</span>
                  </div>
                  <div className="text-sm font-semibold text-white truncate">{task.title}</div>
                </div>

                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-right">
                    <div className="text-xs text-slate-300 font-medium">
                      {task.assignedTo?.fullName || 'Unassigned'}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Rev: {task.reviewer?.fullName?.split(' ')[0] || 'None'}
                    </div>
                  </div>

                  <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full uppercase bg-slate-800 text-slate-300">
                    {task.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <TaskModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onTaskCreated={() => setRefreshKey((prev) => prev + 1)}
          projects={projects}
          members={members}
        />
      )}
    </div>
  );
};
