import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAuth0 } from '@auth0/auth0-react';
import { Layers, Shield, Sparkles, Lock, Mail } from 'lucide-react';

interface LoginPageProps {
  onGoToRegister: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onGoToRegister }) => {
  const { login, loginWithAuth0 } = useAuth();
  const {
    loginWithPopup,
    loginWithRedirect,
    user: auth0User,
    isAuthenticated: isAuth0Authenticated,
    isLoading: isAuth0Loading,
  } = useAuth0();

  const [email, setEmail] = useState<string>('admin@hustlex.com');
  const [password, setPassword] = useState<string>('Password123!');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sync Auth0 profile if authenticated via Auth0
  useEffect(() => {
    if (isAuth0Authenticated && auth0User) {
      handleAuth0Sync(auth0User);
    }
  }, [isAuth0Authenticated, auth0User]);

  const handleAuth0Sync = async (userObj: any) => {
    setLoading(true);
    setError(null);
    try {
      await loginWithAuth0({
        sub: userObj.sub,
        email: userObj.email,
        name: userObj.name || userObj.nickname,
        picture: userObj.picture,
      });
    } catch (err: any) {
      console.error('Auth0 backend sync error:', err);
      setError(err.response?.data?.error || err.response?.data?.details || 'Failed to sync Auth0 account with backend.');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth0Click = async () => {
    setError(null);
    try {
      // Attempt popup login for quick seamless auth
      await loginWithPopup();
    } catch (err: any) {
      console.warn('Popup login cancelled or failed, trying redirect:', err);
      try {
        await loginWithRedirect();
      } catch (redirectErr: any) {
        setError(redirectErr.message || 'Auth0 authentication failed. Check VITE_AUTH0_DOMAIN configuration.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || err.response?.data?.details || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminQuickFill = () => {
    setEmail('admin@hustlex.com');
    setPassword('Password123!');
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
          Enterprise task management • Auth0 SSO • Mission SLA verification
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="glass-panel py-8 px-6 sm:px-10 rounded-2xl border border-slate-800 shadow-2xl space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* Auth0 Primary Single Sign-On Button */}
          <div>
            <button
              type="button"
              onClick={handleAuth0Click}
              disabled={loading || isAuth0Loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-orange-600 via-amber-600 to-indigo-600 hover:from-orange-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2.5 transition-all disabled:opacity-50 group"
            >
              <Shield className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
              <span>Continue with Auth0 SSO</span>
            </button>
            <p className="text-[10px] text-slate-400 text-center mt-1.5">
              Secure OAuth 2.0 / OpenID Connect authentication
            </p>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-4 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Or Sign In with Email
            </span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

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

          {/* Single Admin Account Badge */}
          <div className="pt-4 border-t border-slate-800/80">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Workspace Admin Account
              </span>
              <button
                type="button"
                onClick={handleAdminQuickFill}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 underline"
              >
                Auto-fill
              </button>
            </div>

            <div
              onClick={handleAdminQuickFill}
              className="p-3 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800/80 cursor-pointer text-xs flex items-center justify-between transition-colors"
            >
              <div>
                <div className="font-semibold text-slate-200">Alex Turner</div>
                <div className="text-[11px] text-slate-400">admin@hustlex.com</div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                ADMIN
              </span>
            </div>
          </div>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={onGoToRegister}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Need a direct account? Register here
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
