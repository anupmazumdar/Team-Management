import React, { createContext, useContext, useEffect, useState } from 'react';
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
    if (!token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const wsUrl = import.meta.env.VITE_WS_URL || '/';
    const newSocket = io(wsUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      setConnected(true);
      if (activeTeam) {
        newSocket.emit('join-team', activeTeam.teamId);
      }
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token, activeTeam?.teamId]);

  const joinProject = (projectId: string) => {
    if (socket && connected) {
      socket.emit('join-project', projectId);
    }
  };

  const leaveProject = (projectId: string) => {
    if (socket && connected) {
      socket.emit('leave-project', projectId);
    }
  };

  const sendMessage = (projectId: string, content: string, mentions: string[] = []) => {
    if (socket && connected && activeTeam) {
      socket.emit('send-message', {
        projectId,
        teamId: activeTeam.teamId,
        content,
        mentions,
      });
    }
  };

  const sendTyping = (projectId: string, isTyping: boolean) => {
    if (socket && connected) {
      socket.emit('typing', { projectId, isTyping });
    }
  };

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
