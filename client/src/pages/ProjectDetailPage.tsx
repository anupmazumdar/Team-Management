import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Project, Task, TeamMemberWithStats } from '../types';
import { TaskCard } from '../components/tasks/TaskCard';
import { ChatBox } from '../components/chat/ChatBox';
import {
  ArrowLeft,
  ListTodo,
  MessageSquare,
} from 'lucide-react';

interface ProjectDetailPageProps {
  projectId: string;
  onBack: () => void;
  onSelectTask: (task: Task) => void;
  members: TeamMemberWithStats[];
}

export const ProjectDetailPage: React.FC<ProjectDetailPageProps> = ({
  projectId,
  onBack,
  onSelectTask,
  members,
}) => {
  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'chat'>('tasks');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const fetchProjectDetails = async () => {
      try {
        const res = await api.get(`/projects/${projectId}`);
        if (isMounted) {
          setProject(res.data);
        }
      } catch (err) {
        console.error('Failed to load project:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchProjectDetails();

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  if (loading || !project) {
    return (
      <div className="p-12 text-center text-xs text-slate-400">Loading project...</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </button>

        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          {project.status}
        </span>
      </div>

      <div className="glass-panel rounded-2xl p-6 border border-slate-800">
        <h1 className="text-xl font-bold text-white mb-1.5">{project.name}</h1>
        <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
          {project.description || 'No description provided.'}
        </p>

        {/* Tab Toggle */}
        <div className="flex items-center gap-2 mt-5 border-t border-slate-800/80 pt-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
              activeTab === 'tasks'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <ListTodo className="w-4 h-4" />
            <span>Tasks ({project.tasks?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
              activeTab === 'chat'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Real-Time Chat</span>
          </button>
        </div>
      </div>

      {/* Tab Body */}
      {activeTab === 'tasks' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {!project.tasks || project.tasks.length === 0 ? (
              <div className="col-span-full p-12 text-center text-xs text-slate-400 glass-panel rounded-2xl border border-slate-800">
                No tasks in this project yet.
              </div>
            ) : (
              project.tasks.map((task) => (
                <TaskCard key={task.id} task={task} onSelect={onSelectTask} />
              ))
            )}
          </div>
        </div>
      ) : (
        <ChatBox
          projectId={project.id}
          projectName={project.name}
          members={members}
        />
      )}
    </div>
  );
};
