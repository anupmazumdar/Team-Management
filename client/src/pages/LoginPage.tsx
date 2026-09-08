import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Layers, Lock, Mail, Loader2 } from 'lucide-react';
import { SocialAuthModal, SocialProvider } from '../components/common/SocialAuthModal';

interface LoginPageProps {
  onGoToRegister: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onGoToRegister }) => {
  const { login, loginWithSocial, loginWithGitHubCode } = useAuth();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [emailLoading, setEmailLoading] = useState<boolean>(false);
  const [socialLoading, setSocialLoading] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      if (window.location.hash.includes('access_token=') && window.location.hash.includes('state=google_oauth')) {
        return true;
      }
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('code') && (urlParams.get('state') === 'github_oauth' || !urlParams.get('state'))) {
        return true;
      }
    }
    return false;
  });
  const isAnyLoading = emailLoading || socialLoading;

  const [error, setError] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const errorParam = hashParams.get('error');
      const errorDesc = hashParams.get('error_description');
      if (errorParam) {
        window.history.replaceState({}, document.title, window.location.pathname);
        return `Google Sign-In: ${errorDesc || errorParam}. (Ensure https://team-management-server-pied.vercel.app is added to Authorized redirect URIs in Google Cloud Console)`;
      }
    }
    return null;
  });
  const [socialModalProvider, setSocialModalProvider] = useState<SocialProvider | null>(null);

  // Check for GitHub OAuth ?code= parameter on redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ghCode = urlParams.get('code');
    const state = urlParams.get('state');
    if (!ghCode || (state && state !== 'github_oauth')) return;

    window.history.replaceState({}, document.title, window.location.pathname);

    let isMounted = true;
    const syncGitHubCode = async () => {
      try {
        await loginWithGitHubCode(ghCode);
      } catch (err: any) {
        console.error('GitHub code exchange error:', err);
        if (isMounted) {
          if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
            setError('Request timed out connecting to backend server. Render may be waking up.');
          } else {
            setError(
              err.response?.data?.error ||
              err.response?.data?.details ||
              err.message ||
              'Failed to complete GitHub sign-in. Please ensure GITHUB_CLIENT_SECRET is set in Render environment variables.'
            );
          }
        }
      } finally {
        if (isMounted) {
          setSocialLoading(false);
        }
      }
    };

    syncGitHubCode();

    return () => {
      isMounted = false;
    };
  }, [loginWithGitHubCode]);

  const handleSocialSync = useCallback(async (data: {
    provider: SocialProvider;
    providerId: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
    headline?: string;
  }) => {
    setSocialLoading(true);
    setError(null);
    try {
      await loginWithSocial(data);
      setSocialModalProvider(null);
    } catch (err: any) {
      console.error('Social OAuth sync error:', err);
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        setError('Backend server request timed out. Render may be waking up, please try again.');
      } else {
        setError(err.response?.data?.error || err.response?.data?.details || err.message || 'Failed to authenticate with social provider.');
      }
    } finally {
      setSocialLoading(false);
    }
  }, [loginWithSocial]);

  const GOOGLE_CLIENT_ID =
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    '612857418194-j68nke48tjglhvtdql05s8s7tfj4bhpe.apps.googleusercontent.com';

  // Check for Google OAuth redirect in URL hash (#access_token=...)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.location.hash) return;
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const accessToken = hashParams.get('access_token');
    const state = hashParams.get('state');

    if (!accessToken || state !== 'google_oauth') return;
    window.history.replaceState({}, document.title, window.location.pathname);

    let isMounted = true;
    const syncGoogleProfile = async () => {
      try {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const profile = await userInfoRes.json();
        if (!profile.email) {
          throw new Error('No email found in Google profile');
        }
        await loginWithSocial({
          provider: 'google',
          providerId: `google|${profile.sub}`,
          email: profile.email,
          fullName: profile.name || profile.email.split('@')[0],
          avatarUrl: profile.picture,
          headline: 'Google Verified Member',
        });
      } catch (err: any) {
        console.error('Google profile sync error:', err);
        if (isMounted) {
          if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
            setError('Request timed out connecting to backend server. Render may be waking up.');
          } else {
            setError(err.response?.data?.error || err.response?.data?.details || err.message || 'Failed to sync Google profile with database.');
          }
        }
      } finally {
        if (isMounted) {
          setSocialLoading(false);
        }
      }
    };

    syncGoogleProfile();

    return () => {
      isMounted = false;
    };
  }, [loginWithSocial]);

  // Direct full-page OAuth redirect (100% immune to AdBlock & popup blockers)
  const handleGoogleRealSignIn = () => {
    setError(null);
    setSocialLoading(true);
    const redirectUri = window.location.origin;
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=openid%20email%20profile&include_granted_scopes=true&state=google_oauth&prompt=select_account`;
    window.location.href = googleAuthUrl;
  };

  const GITHUB_CLIENT_ID =
    import.meta.env.VITE_GITHUB_CLIENT_ID || 'Ov23livtqhYLVsxl5EUM';

  const handleGitHubRealSignIn = () => {
    setError(null);
    setSocialLoading(true);
    const redirectUri = window.location.origin;
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=read:user,user:email&redirect_uri=${encodeURIComponent(redirectUri)}&state=github_oauth`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        setError('Backend server request timed out (20s). Render backend is waking up or database is connecting. Please wait 10 seconds and try again.');
      } else if (!err.response) {
        setError('Cannot connect to backend server. Render may be waking up from sleep. Please try again in a few moments.');
      } else {
        setError(err.response?.data?.error || err.response?.data?.details || err.message || 'Failed to login');
      }
    } finally {
      setEmailLoading(false);
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
          Enterprise task management • Real-time SLA tracking
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="glass-panel py-8 px-6 sm:px-10 rounded-2xl border border-slate-800 shadow-2xl space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
              {error}
            </div>
          )}


          {/* Social Authenticators: Google & GitHub */}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 text-center mb-2.5">
              Social Authenticators (Auto-Saved to DB)
            </div>
            <div className="grid grid-cols-2 gap-3">
              {/* Google */}
              <button
                type="button"
                onClick={handleGoogleRealSignIn}
                disabled={isAnyLoading}
                className="py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shadow-sm group disabled:opacity-50"
                title="Sign in with Google"
              >
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Google</span>
              </button>

              {/* GitHub */}
              <button
                type="button"
                onClick={handleGitHubRealSignIn}
                disabled={isAnyLoading}
                className="py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shadow-sm group disabled:opacity-50"
                title="Sign in with GitHub (Live OAuth)"
              >
                <svg className="w-4 h-4 fill-current text-white flex-shrink-0" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                </svg>
                <span>GitHub</span>
              </button>
            </div>
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
                  placeholder="name@company.com"
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
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isAnyLoading}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
            >
              {emailLoading ? (
                <>
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Sign in</span>
              )}
            </button>
          </form>

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


      {/* Social Authenticator Modal (Google, GitHub) */}
      <SocialAuthModal
        isOpen={!!socialModalProvider}
        provider={socialModalProvider}
        onClose={() => setSocialModalProvider(null)}
        onSocialSync={handleSocialSync}
        onRealGoogleSignIn={handleGoogleRealSignIn}
        onRealGitHubSignIn={handleGitHubRealSignIn}
        loading={socialLoading}
      />
    </div>
  );
};
