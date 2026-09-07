import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { User, TeamMemberInfo, TeamRole } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  teams: TeamMemberInfo[];
  activeTeam: TeamMemberInfo | null;
  activeRole: TeamRole | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  loginWithAuth0: (auth0User: { sub?: string; email?: string; name?: string; picture?: string }) => Promise<void>;
  loginWithSocial: (data: {
    provider: 'google' | 'github' | 'linkedin' | 'auth0';
    providerId: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
    headline?: string;
  }) => Promise<void>;
  register: (data: { email: string; password: string; fullName: string; title?: string }) => Promise<void>;
  logout: () => void;
  switchTeam: (teamId: string) => void;
  quickSwitchUser: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('hustlex_token'));
  const [teams, setTeams] = useState<TeamMemberInfo[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(localStorage.getItem('hustlex_active_team_id'));
  const [loading, setLoading] = useState<boolean>(true);

  const activeTeam = teams.find((t) => t.teamId === activeTeamId) || teams[0] || null;
  const activeRole: TeamRole | null = activeTeam ? activeTeam.role : null;

  const refreshProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
      setTeams(res.data.teams || []);

      if (res.data.teams?.length > 0) {
        const stored = localStorage.getItem('hustlex_active_team_id');
        const match = res.data.teams.find((t: TeamMemberInfo) => t.teamId === stored);
        const selectedId = match ? match.teamId : res.data.teams[0].teamId;
        setActiveTeamId(selectedId);
        localStorage.setItem('hustlex_active_team_id', selectedId);
      }
    } catch (err: any) {
      console.error('Failed to load user profile:', err);
      // Only clear credentials if the server explicitly rejected the token as invalid/expired
      if (err.response?.status === 401 || err.response?.status === 403) {
        setUser(null);
        setToken(null);
        localStorage.removeItem('hustlex_token');
        localStorage.removeItem('hustlex_active_team_id');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      if (!user) {
        refreshProfile();
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email: string, password = 'Password123!') => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token: newToken, user: newUser, teams: userTeams } = res.data;
      localStorage.setItem('hustlex_token', newToken);
      setToken(newToken);
      setUser(newUser);
      setTeams(userTeams || []);

      if (userTeams?.length > 0) {
        setActiveTeamId(userTeams[0].teamId);
        localStorage.setItem('hustlex_active_team_id', userTeams[0].teamId);
      }
    } finally {
      setLoading(false);
    }
  };

  const loginWithAuth0 = async (auth0User: { sub?: string; email?: string; name?: string; picture?: string }) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/auth0-sync', {
        auth0Id: auth0User.sub,
        email: auth0User.email,
        fullName: auth0User.name,
        avatarUrl: auth0User.picture,
      });
      const { token: newToken, user: newUser, teams: userTeams } = res.data;
      localStorage.setItem('hustlex_token', newToken);
      setToken(newToken);
      setUser(newUser);
      setTeams(userTeams || []);

      if (userTeams?.length > 0) {
        setActiveTeamId(userTeams[0].teamId);
        localStorage.setItem('hustlex_active_team_id', userTeams[0].teamId);
      }
    } finally {
      setLoading(false);
    }
  };

  const loginWithSocial = async (data: {
    provider: 'google' | 'github' | 'linkedin' | 'auth0';
    providerId: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
    headline?: string;
  }) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/social-sync', data);
      const { token: newToken, user: newUser, teams: userTeams } = res.data;
      localStorage.setItem('hustlex_token', newToken);
      setToken(newToken);
      setUser(newUser);
      setTeams(userTeams || []);

      if (userTeams?.length > 0) {
        setActiveTeamId(userTeams[0].teamId);
        localStorage.setItem('hustlex_active_team_id', userTeams[0].teamId);
      }
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: { email: string; password: string; fullName: string; title?: string }) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/register', data);
      const { token: newToken, user: newUser } = res.data;
      localStorage.setItem('hustlex_token', newToken);
      setToken(newToken);
      setUser(newUser);
      await refreshProfile();
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('hustlex_token');
    localStorage.removeItem('hustlex_active_team_id');
    setToken(null);
    setUser(null);
    setTeams([]);
    setActiveTeamId(null);
  };

  const switchTeam = (teamId: string) => {
    setActiveTeamId(teamId);
    localStorage.setItem('hustlex_active_team_id', teamId);
    window.location.reload();
  };

  // Demo user quick switcher for instant testing
  const quickSwitchUser = async (email: string) => {
    await login(email, 'Password123!');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        teams,
        activeTeam,
        activeRole,
        loading,
        login,
        loginWithAuth0,
        loginWithSocial,
        register,
        logout,
        switchTeam,
        quickSwitchUser,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
