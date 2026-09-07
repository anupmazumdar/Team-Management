import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Layers, Shield, Sparkles, ArrowRight, Lock, Mail } from 'lucide-react';

interface LoginPageProps {
  onGoToRegister: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onGoToRegister }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState<string>('admin@hustlex.com');
  const [password, setPassword] = useState<string>('Password123!');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  const handlePersonaLogin = async (personaEmail: string) => {
    setEmail(personaEmail);
    setPassword('Password123!');
    setLoading(true);
    setError(null);
    try {
      await login(personaEmail, 'Password123!');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/15 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-xl shadow-indigo-600/25 mb-4">
          <Layers className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight">HustleX Workspace</h2>
        <p className="mt-1 text-xs text-slate-400">
          Task verification state machine • Dynamic roles • 6-Mo timeline
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="glass-panel py-8 px-6 sm:px-10 rounded-2xl border border-slate-800 shadow-2xl">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 mt-2"
            >
              {loading ? 'Authenticating...' : 'Sign in'}
            </button>
          </form>

          {/* Quick 1-Click Persona Login */}
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Quick Persona Logins (1-Click)
            </div>

            <div className="space-y-1.5">
              {[
                { name: 'Alex Turner', email: 'admin@hustlex.com', role: 'ADMIN', color: 'text-rose-400' },
                { name: 'Sarah Chen', email: 'lead@hustlex.com', role: 'LEAD', color: 'text-amber-400' },
                { name: 'Devin Patel', email: 'intern1@hustlex.com', role: 'INTERN 1', color: 'text-indigo-400' },
                { name: 'Maya Lin', email: 'intern2@hustlex.com', role: 'INTERN 2', color: 'text-indigo-400' },
                { name: 'Rahul Sharma', email: 'intern3@hustlex.com', role: 'INTERN 3', color: 'text-indigo-400' },
              ].map((p) => (
                <button
                  key={p.email}
                  type="button"
                  onClick={() => handlePersonaLogin(p.email)}
                  className="w-full text-left p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800/80 text-xs flex items-center justify-between transition-colors group"
                >
                  <span className="font-medium text-slate-200 group-hover:text-white">
                    {p.name}
                  </span>
                  <span className={`text-[10px] font-mono font-bold ${p.color}`}>
                    {p.role} →
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={onGoToRegister}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Need an account? Register here
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
