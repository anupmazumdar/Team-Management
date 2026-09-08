import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  joinProject: (projectId: string) => void;
  leaveProject: (projectId: string) => void;
  sendMessage: (projectId: string, content: string, mentions?: string[]) => void;
  sendTyping: (projectId: string, isTyping: boolean) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, activeTeam } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState<boolean>(false);

  useEffect(() => {
    if (!token) return;

    const defaultWsUrl = import.meta.env.DEV
      ? '/'
      : 'https://hustlex-team-workspace-api.onrender.com';
    const wsUrl = import.meta.env.VITE_WS_URL || defaultWsUrl;
    const newSocket = io(wsUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    const timer = setTimeout(() => {
      setSocket(newSocket);
    }, 0);

    return () => {
      clearTimeout(timer);
      newSocket.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [token]);

  // Join active team room whenever socket connects or active team changes
  useEffect(() => {
    if (socket && connected && activeTeam?.teamId) {
      socket.emit('join-team', activeTeam.teamId);
    }
  }, [socket, connected, activeTeam?.teamId]);

  const joinProject = useCallback((projectId: string) => {
    if (socket && connected) {
      socket.emit('join-project', projectId);
    }
  }, [socket, connected]);

  const leaveProject = useCallback((projectId: string) => {
    if (socket && connected) {
      socket.emit('leave-project', projectId);
    }
  }, [socket, connected]);

  const sendMessage = useCallback((projectId: string, content: string, mentions: string[] = []) => {
    if (socket && connected && activeTeam) {
      socket.emit('send-message', {
        projectId,
        teamId: activeTeam.teamId,
        content,
        mentions,
      });
    }
  }, [socket, connected, activeTeam]);

  const sendTyping = useCallback((projectId: string, isTyping: boolean) => {
    if (socket && connected) {
      socket.emit('typing', { projectId, isTyping });
    }
  }, [socket, connected]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        joinProject,
        leaveProject,
        sendMessage,
        sendTyping,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
