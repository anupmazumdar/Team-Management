import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { api } from './services/api';
import { Task, Project } from './types';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { MyTasksPage } from './pages/MyTasksPage';
import { AllTasksPage } from './pages/AllTasksPage';
import { TaskDetailPage } from './pages/TaskDetailPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { TeamPage } from './pages/TeamPage';
import { ChatPage } from './pages/ChatPage';
import { InternshipTimelinePage } from './pages/InternshipTimelinePage';
import { ReviewQueuePage } from './pages/ReviewQueuePage';
import { ActivityLogsPage } from './pages/ActivityLogsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { CalendarPage } from './pages/CalendarPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

const MainWorkspace: React.FC = () => {
  const { user, activeTeam, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [reviewCount, setReviewCount] = useState<number>(0);
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);

  // Poll review queue count for leads/admins
  const fetchReviewCount = async () => {
    if (!activeTeam) return;
    try {
      const res = await api.get('/tasks?reviewQueue=true');
      setReviewCount((res.data || []).length);
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    if (activeTeam) {
      fetchReviewCount();
      const interval = setInterval(fetchReviewCount, 15000);
      return () => clearInterval(interval);
    }
  }, [activeTeam?.teamId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 text-xs">
        <div className="w-8 h-8 rounded-xl bg-indigo-600 animate-spin mb-3"></div>
        <span>Initializing HustleX Workspace...</span>
      </div>
    );
  }

  if (!user) {
    return isRegisterMode ? (
      <RegisterPage onGoToLogin={() => setIsRegisterMode(false)} />
    ) : (
      <LoginPage onGoToRegister={() => setIsRegisterMode(true)} />
    );
  }

  const handleSelectTask = (task: Task) => {
    setSelectedTaskId(task.id);
    setCurrentTab('task-detail');
  };

  const handleSelectProject = (project: Project) => {
    setSelectedProjectId(project.id);
    setCurrentTab('project-detail');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={(tab) => {
            setCurrentTab(tab);
            if (tab !== 'task-detail') setSelectedTaskId(null);
            if (tab !== 'project-detail') setSelectedProjectId(null);
          }}
          reviewCount={reviewCount}
        />

        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-950/40">
          {currentTab === 'dashboard' && (
            <DashboardPage setCurrentTab={setCurrentTab} onSelectTask={handleSelectTask} />
          )}

          {currentTab === 'my-tasks' && <MyTasksPage onSelectTask={handleSelectTask} />}

          {currentTab === 'tasks' && <AllTasksPage onSelectTask={handleSelectTask} />}

          {currentTab === 'task-detail' && selectedTaskId && (
            <TaskDetailPage
              taskId={selectedTaskId}
              onBack={() => setCurrentTab('tasks')}
            />
          )}

          {currentTab === 'projects' && <ProjectsPage onSelectProject={handleSelectProject} />}

          {currentTab === 'project-detail' && selectedProjectId && (
            <ProjectDetailPage
              projectId={selectedProjectId}
              onBack={() => setCurrentTab('projects')}
              onSelectTask={handleSelectTask}
              members={[]}
            />
          )}

          {currentTab === 'team' && <TeamPage />}

          {currentTab === 'chat' && <ChatPage />}

          {currentTab === 'internship' && <InternshipTimelinePage />}

          {currentTab === 'review-queue' && (
            <ReviewQueuePage onSelectTask={handleSelectTask} />
          )}

          {currentTab === 'activity' && <ActivityLogsPage />}

          {currentTab === 'notifications' && <NotificationsPage />}

          {currentTab === 'calendar' && <CalendarPage onSelectTask={handleSelectTask} />}
        </main>
      </div>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <MainWorkspace />
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
