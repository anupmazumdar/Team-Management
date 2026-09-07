import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAuth0 } from '@auth0/auth0-react';
import { Layers, Shield, Sparkles, Lock, Mail, SlidersHorizontal, Loader2 } from 'lucide-react';
import { Auth0Modal } from '../components/common/Auth0Modal';
import { SocialAuthModal, SocialProvider } from '../components/common/SocialAuthModal';

interface LoginPageProps {
  onGoToRegister: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onGoToRegister }) => {
  const { login, loginWithAuth0, loginWithSocial } = useAuth();
  const {
    loginWithRedirect,
    user: auth0User,
    isAuthenticated: isAuth0Authenticated,
  } = useAuth0();

  const [email, setEmail] = useState<string>('admin@hustlex.com');
  const [password, setPassword] = useState<string>('Password123!');
  const [emailLoading, setEmailLoading] = useState<boolean>(false);
  const [auth0Loading, setAuth0Loading] = useState<boolean>(false);
  const [socialLoading, setSocialLoading] = useState<boolean>(false);
  const isAnyLoading = emailLoading || auth0Loading || socialLoading;

  const [error, setError] = useState<string | null>(null);
  const [showAuth0Modal, setShowAuth0Modal] = useState<boolean>(false);
  const [socialModalProvider, setSocialModalProvider] = useState<SocialProvider | null>(null);

  // Sync Auth0 profile if returning from live Auth0 redirect
  useEffect(() => {
    if (isAuth0Authenticated && auth0User) {
      handleAuth0Sync(auth0User);
    }
  }, [isAuth0Authenticated, auth0User]);

  const handleAuth0Sync = async (userObj: any) => {
    setAuth0Loading(true);
    setError(null);
    try {
      await loginWithAuth0({
        sub: userObj.sub,
        email: userObj.email,
        name: userObj.name || userObj.nickname,
        picture: userObj.picture,
      });
      setShowAuth0Modal(false);
    } catch (err: any) {
      console.error('Auth0 backend sync error:', err);
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        setError('Backend server request timed out. Render may be waking up, please try again.');
      } else {
        setError(err.response?.data?.error || err.response?.data?.details || err.message || 'Failed to sync Auth0 account with backend.');
      }
    } finally {
      setAuth0Loading(false);
    }
  };

  const handleSocialSync = async (data: {
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
  };

  const GOOGLE_CLIENT_ID =
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    '612857418194-j68nke48tjglhvtdql05s8s7tfj4bhpe.apps.googleusercontent.com';

  const handleGoogleRealSignIn = () => {
    setError(null);
    if (!window.google?.accounts?.oauth2) {
      setError('Google Identity Services is initializing. Please click again in 1 second.');
      return;
    }
    setSocialLoading(true);
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'openid email profile',
        error_callback: (nonOAuthErr: any) => {
          console.error('Google Sign-In error_callback:', nonOAuthErr);
          if (nonOAuthErr.type === 'popup_failed_to_open') {
            setError('Google popup was blocked. Please disable AdBlock or allow popups for this site.');
          } else if (nonOAuthErr.type === 'popup_closed') {
            setError('Google popup was closed before completing login.');
          } else {
            setError(`Google Sign-In: ${nonOAuthErr.message || nonOAuthErr.type || 'Origin error. Ensure https://team-management-server-pied.vercel.app is added to Authorized JavaScript Origins in Google Cloud Console.'}`);
          }
          setSocialLoading(false);
        },
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            console.error('Google OAuth error:', tokenResponse);
            setError(`Google Sign-In: ${tokenResponse.error_description || tokenResponse.error}. (Ensure https://team-management-server-pied.vercel.app is added to Authorized Origins in Google Cloud Console)`);
            setSocialLoading(false);
            return;
          }
          if (tokenResponse.access_token) {
            try {
              // Fetch user profile from Google's standard UserInfo endpoint
              const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
              });
              const profile = await userInfoRes.json();
              await handleSocialSync({
                provider: 'google',
                providerId: `google|${profile.sub}`,
                email: profile.email,
                fullName: profile.name || profile.email.split('@')[0],
                avatarUrl: profile.picture,
                headline: 'Google Verified Member',
              });
            } catch (syncErr: any) {
              console.error('Failed to sync Google user:', syncErr);
              if (syncErr.code === 'ECONNABORTED' || syncErr.message?.includes('timeout')) {
                setError('Request timed out connecting to backend server. Render may be waking up.');
              } else {
                setError(syncErr.response?.data?.error || syncErr.response?.data?.details || syncErr.message || 'Failed to sync Google profile with database.');
              }
            } finally {
              setSocialLoading(false);
            }
          }
        },
      });
      client.requestAccessToken();
    } catch (err: any) {
      console.error('Failed to initialize Google token client:', err);
      setError('Could not open Google Sign-In popup. Please ensure popups are allowed in your browser.');
      setSocialLoading(false);
    }
  };

  const handleAuth0Click = async () => {
    setError(null);
    const storedDomain = localStorage.getItem('hustlex_auth0_domain');
    const storedClientId = localStorage.getItem('hustlex_auth0_client_id');
    const envDomain = import.meta.env.VITE_AUTH0_DOMAIN;
    const envClientId = import.meta.env.VITE_AUTH0_CLIENT_ID;

    const hasRealDomain = (storedDomain && storedDomain.includes('.')) || (envDomain && envDomain.includes('.') && envDomain !== 'dev-hustlex.us.auth0.com');
    const hasRealClientId = (storedClientId && storedClientId.length > 5) || (envClientId && envClientId.length > 5 && envClientId !== 'client-id-placeholder');

    if (hasRealDomain && hasRealClientId) {
      // Direct live Auth0 redirect
      setAuth0Loading(true);
      try {
        await loginWithRedirect({
          authorizationParams: {
            redirect_uri: window.location.origin,
          },
        });
      } catch (err: any) {
        console.warn('Auth0 redirect error:', err);
        setAuth0Loading(false);
        setShowAuth0Modal(true);
      }
    } else {
      // Open interactive Auth0 SSO drawer/modal with 1-click sync or tenant config
      setShowAuth0Modal(true);
    }
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAuth0Click}
                disabled={isAnyLoading}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-orange-600 via-amber-600 to-indigo-600 hover:from-orange-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2.5 transition-all disabled:opacity-50 group"
              >
                {auth0Loading ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <Shield className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                )}
                <span>{auth0Loading ? 'Authenticating with Auth0...' : 'Continue with Auth0 SSO'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAuth0Modal(true)}
                title="Configure Auth0 Tenant / Sandbox"
                className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-orange-400 border border-slate-800 transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-1.5 flex items-center justify-center gap-1.5">
              <span>Secure OAuth 2.0 / OpenID Connect</span>
              <span>•</span>
              <button
                type="button"
                onClick={() => setShowAuth0Modal(true)}
                className="text-orange-400 hover:underline font-semibold"
              >
                Configure / Instant Sync
              </button>
            </p>
          </div>

          {/* Social Authenticators: Google, GitHub, LinkedIn */}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 text-center mb-2.5">
              Social Authenticators (Auto-Saved to DB)
            </div>
            <div className="grid grid-cols-3 gap-2">
              {/* Google */}
              <button
                type="button"
                onClick={handleGoogleRealSignIn}
                disabled={isAnyLoading}
                className="py-2 px-2 sm:px-3 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02] shadow-sm group disabled:opacity-50"
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
                onClick={() => setSocialModalProvider('github')}
                disabled={isAnyLoading}
                className="py-2 px-2 sm:px-3 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02] shadow-sm group disabled:opacity-50"
                title="Sign in with GitHub"
              >
                <svg className="w-4 h-4 fill-current text-white flex-shrink-0" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                </svg>
                <span>GitHub</span>
              </button>

              {/* LinkedIn */}
              <button
                type="button"
                onClick={() => setSocialModalProvider('linkedin')}
                disabled={isAnyLoading}
                className="py-2 px-2 sm:px-3 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02] shadow-sm group disabled:opacity-50"
                title="Sign in with LinkedIn"
              >
                <svg className="w-4 h-4 fill-current text-[#0A66C2] flex-shrink-0" viewBox="0 0 24 24">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                </svg>
                <span>LinkedIn</span>
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

      {/* Auth0 SSO Modal */}
      <Auth0Modal
        isOpen={showAuth0Modal}
        onClose={() => setShowAuth0Modal(false)}
        onInstantAuth0Sync={handleAuth0Sync}
        loading={auth0Loading}
      />

      {/* Social Authenticator Modal (Google, GitHub, LinkedIn) */}
      <SocialAuthModal
        isOpen={!!socialModalProvider}
        provider={socialModalProvider}
        onClose={() => setSocialModalProvider(null)}
        onSocialSync={handleSocialSync}
        onRealGoogleSignIn={handleGoogleRealSignIn}
        loading={socialLoading}
      />
    </div>
  );
};
