import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Project, TeamMemberWithStats } from '../types';
import { ChatBox } from '../components/chat/ChatBox';
import { Hash } from 'lucide-react';

export const ChatPage: React.FC = () => {
  const { activeTeam } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<TeamMemberWithStats[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    if (!activeTeam) return;

    const fetchChatData = async () => {
      try {
        const [projRes, teamRes] = await Promise.all([
          api.get('/projects'),
          api.get(`/teams/${activeTeam.teamId}`),
        ]);

        if (isMounted) {
          const projs: Project[] = projRes.data || [];
          setProjects(projs);
          setMembers(teamRes.data?.members || []);
          setSelectedProjectId((prev) => (projs.length > 0 && !prev ? projs[0].id : prev));
        }
      } catch (err) {
        console.error('Failed to load chat channels:', err);
      }
    };

    fetchChatData();

    return () => {
      isMounted = false;
    };
  }, [activeTeam]);

  const activeProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Team Collaboration Chat</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Real-time Socket.IO communication with @mentions and automated verification alerts.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Project Channels List */}
        <div className="glass-panel rounded-2xl p-4 border border-slate-800 space-y-2 h-[650px] flex flex-col">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5 text-indigo-400" /> Project Channels
          </div>

          <div className="space-y-1 flex-1 overflow-y-auto">
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedProjectId(p.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between transition-colors ${
                  p.id === activeProject?.id
                    ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/25'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <span className="truncate">#{p.name}</span>
                <span className="text-[10px] opacity-70 font-mono">
                  {p.messageCount || 0}
                </span>
              </button>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 px-2 leading-relaxed">
            💡 <strong>Tip:</strong> Type <code>@</code> in the chat input to mention team members and dispatch alerts.
          </div>
        </div>

        {/* Right Chat Area */}
        <div className="md:col-span-3">
          {activeProject ? (
            <ChatBox
              projectId={activeProject.id}
              projectName={activeProject.name}
              members={members}
            />
          ) : (
            <div className="glass-panel rounded-2xl p-12 text-center text-xs text-slate-400 border border-slate-800">
              No projects created yet. Create a project to start chatting.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
