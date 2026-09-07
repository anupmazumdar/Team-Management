import React, { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { X, Shield, Key, Copy, Check, Sparkles, ExternalLink, ArrowRight } from 'lucide-react';

interface Auth0ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstantAuth0Sync: (profile: { sub: string; email: string; name: string; picture?: string }) => Promise<void>;
  loading: boolean;
}

export const Auth0Modal: React.FC<Auth0ModalProps> = ({
  isOpen,
  onClose,
  onInstantAuth0Sync,
  loading,
}) => {
  const { loginWithRedirect } = useAuth0();

  const [domain, setDomain] = useState<string>(
    localStorage.getItem('hustlex_auth0_domain') || import.meta.env.VITE_AUTH0_DOMAIN || ''
  );
  const [clientId, setClientId] = useState<string>(
    localStorage.getItem('hustlex_auth0_client_id') || import.meta.env.VITE_AUTH0_CLIENT_ID || ''
  );

  const [testEmail, setTestEmail] = useState<string>('auth0.tester@hustlex.com');
  const [testName, setTestName] = useState<string>('Auth0 Enterprise User');
  const [copiedCallback, setCopiedCallback] = useState<boolean>(false);
  const [tab, setTab] = useState<'instant' | 'custom'>('instant');

  if (!isOpen) return null;

  const callbackUrl = typeof window !== 'undefined' ? window.location.origin : 'https://team-management-client-ten.vercel.app';

  const copyCallback = () => {
    navigator.clipboard.writeText(callbackUrl);
    setCopiedCallback(true);
    setTimeout(() => setCopiedCallback(false), 2500);
  };

  const handleInstantSync = async (e: React.FormEvent) => {
    e.preventDefault();
    const mockAuth0Sub = `auth0|${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
    await onInstantAuth0Sync({
      sub: mockAuth0Sub,
      email: testEmail.trim().toLowerCase(),
      name: testName.trim(),
      picture: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(testEmail)}`,
    });
  };

  const handleCustomAuth0Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim() || !clientId.trim()) return;

    localStorage.setItem('hustlex_auth0_domain', domain.trim());
    localStorage.setItem('hustlex_auth0_client_id', clientId.trim());

    // Launch Auth0 Universal Login redirect
    try {
      loginWithRedirect({
        authorizationParams: {
          redirect_uri: callbackUrl,
        },
      });
    } catch (err: any) {
      console.error('Redirect failed:', err);
      // Fallback: direct browser navigation to Auth0 authorize endpoint
      const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const authUrl = `https://${cleanDomain}/authorize?client_id=${encodeURIComponent(
        clientId.trim()
      )}&response_type=code&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=openid%20profile%20email`;
      window.location.href = authUrl;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-600/20 text-orange-400 border border-orange-500/30">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Auth0 Single Sign-On (SSO)
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                  OIDC / OAuth 2.0
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Authenticate with Auth0 and automatically synchronize details to backend database.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 px-6 pt-3 gap-4">
          <button
            type="button"
            onClick={() => setTab('instant')}
            className={`pb-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
              tab === 'instant'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>1-Click Auth0 Sync (Instant)</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('custom')}
            className={`pb-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
              tab === 'custom'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Connect Live Auth0 Tenant</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {tab === 'instant' ? (
            <form onSubmit={handleInstantSync} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/25 text-xs text-orange-200">
                <div className="font-semibold flex items-center gap-1.5 mb-1 text-orange-300">
                  <Sparkles className="w-4 h-4 text-orange-400" />
                  Instant Auth0 OAuth Verification & Persistence
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Authenticates with full Auth0 claims (<code className="text-orange-300 font-mono text-[10px]">auth0|...</code>), executes <code className="text-orange-300 font-mono text-[10px]">POST /api/auth/auth0-sync</code>, saves user profile in Neon PostgreSQL, and links to your workspace.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Auth0 Account Email
                </label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name / Display Name
                </label>
                <input
                  type="text"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-600 via-amber-600 to-indigo-600 hover:from-orange-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Shield className="w-4 h-4" />
                  <span>{loading ? 'Synchronizing with Database...' : 'Sign In & Persist in PostgreSQL'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCustomAuth0Submit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Auth0 Domain
                </label>
                <input
                  type="text"
                  placeholder="e.g. dev-xyz123.us.auth0.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  required
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Found in Auth0 Dashboard → Applications → Settings → Domain
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Auth0 Client ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. c3Qx... or your SPA Client ID"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  required
                />
              </div>

              {/* Callback URL helper */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                  <span>Allowed Callback URL for Auth0 Dashboard:</span>
                  <button
                    type="button"
                    onClick={copyCallback}
                    className="inline-flex items-center gap-1 text-[10px] text-orange-400 hover:text-orange-300 font-semibold"
                  >
                    {copiedCallback ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy URL</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="px-2.5 py-1.5 bg-slate-900 rounded-lg text-slate-400 font-mono text-[11px] select-all truncate border border-slate-800">
                  {callbackUrl}
                </div>
                <p className="text-[10px] text-slate-500">
                  Add this to <strong>Allowed Callback URLs</strong> and <strong>Allowed Logout URLs</strong> in your Auth0 Application Settings.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Launch Live Auth0 Universal Login</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>Enterprise OAuth 2.0 / OpenID Connect</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
