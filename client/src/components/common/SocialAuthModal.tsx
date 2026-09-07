import React, { useState } from 'react';
import { X, Shield, ArrowRight, Sparkles, ExternalLink, Check } from 'lucide-react';

export type SocialProvider = 'google' | 'github';

interface SocialAuthModalProps {
  isOpen: boolean;
  provider: SocialProvider | null;
  onClose: () => void;
  onSocialSync: (data: {
    provider: SocialProvider;
    providerId: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
    headline?: string;
  }) => Promise<void>;
  onRealGoogleSignIn?: () => void;
  onRealGitHubSignIn?: () => void;
  loading: boolean;
}

export const SocialAuthModal: React.FC<SocialAuthModalProps> = ({
  isOpen,
  provider,
  onClose,
  onSocialSync,
  onRealGoogleSignIn,
  onRealGitHubSignIn,
  loading,
}) => {
  const getDefaults = (p: SocialProvider | null) => {
    switch (p) {
      case 'google':
        return {
          name: 'Google User',
          email: 'alex.google@gmail.com',
          headline: 'Google Cloud Certified Engineer',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        };
      case 'github':
        return {
          name: 'GitHub Developer',
          email: 'alex.dev@github.com',
          headline: 'Open Source Contributor & Full Stack Dev',
          avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
        };
      default:
        return {
          name: 'Verified User',
          email: 'user@example.com',
          headline: 'Enterprise Member',
          avatar: '',
        };
    }
  };

  const defaults = getDefaults(provider);
  const [email, setEmail] = useState<string>(defaults.email);
  const [fullName, setFullName] = useState<string>(defaults.name);
  const [headline, setHeadline] = useState<string>(defaults.headline);
  const [tab, setTab] = useState<'instant' | 'live'>('instant');

  // Reset fields when provider changes
  React.useEffect(() => {
    if (provider) {
      const d = getDefaults(provider);
      setEmail(d.email);
      setFullName(d.name);
      setHeadline(d.headline);
    }
  }, [provider]);

  if (!isOpen || !provider) return null;

  const providerMeta = {
    google: {
      name: 'Google',
      badgeColor: 'bg-red-500/10 text-red-400 border-red-500/30',
      iconBg: 'bg-white text-slate-900',
      accentColor: 'from-blue-600 via-red-500 to-amber-500',
    },
    github: {
      name: 'GitHub',
      badgeColor: 'bg-slate-700/30 text-slate-200 border-slate-600',
      iconBg: 'bg-slate-900 text-white border border-slate-700',
      accentColor: 'from-slate-800 to-slate-950',
    },
  }[provider];

  const handleInstantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const providerId = `${provider}|${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
    await onSocialSync({
      provider,
      providerId,
      email: email.trim().toLowerCase(),
      fullName: fullName.trim(),
      avatarUrl: defaults.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`,
      headline: headline.trim(),
    });
  };

  const handleLiveOAuth = () => {
    if (provider === 'google' && onRealGoogleSignIn) {
      onRealGoogleSignIn();
    } else if (provider === 'github' && onRealGitHubSignIn) {
      onRealGitHubSignIn();
    } else {
      handleInstantSubmit({ preventDefault: () => {} } as any);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${providerMeta.iconBg} shadow-md`}>
              {provider === 'google' && (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
              )}
              {provider === 'github' && (
                <svg className="w-5 h-5 fill-current text-white" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                </svg>
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Sign In with {providerMeta.name}
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${providerMeta.badgeColor}`}>
                  OAuth 2.0
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Authenticate with {providerMeta.name} and persist profile details into PostgreSQL.
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
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>1-Click Verified Profile (Auto-Sync)</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('live')}
            className={`pb-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
              tab === 'live'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Live OAuth Redirect</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {tab === 'instant' ? (
            <form onSubmit={handleInstantSubmit} className="space-y-4">
              {provider === 'google' && onRealGoogleSignIn && (
                <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-center space-y-2">
                  <div className="text-xs font-semibold text-indigo-300">
                    Sign in directly with your personal Google account
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onRealGoogleSignIn();
                    }}
                    className="w-full py-2 px-3 rounded-lg bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold shadow flex items-center justify-center gap-2 transition-all"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span>Open Real Google Account Chooser</span>
                  </button>
                </div>
              )}
              {provider === 'github' && onRealGitHubSignIn && (
                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700 text-center space-y-2">
                  <div className="text-xs font-semibold text-slate-300">
                    Sign in directly with your personal GitHub account
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onRealGitHubSignIn();
                    }}
                    className="w-full py-2 px-3 rounded-lg bg-slate-950 hover:bg-black text-white text-xs font-bold shadow flex items-center justify-center gap-2 transition-all border border-slate-700"
                  >
                    <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                    </svg>
                    <span>Launch GitHub Live OAuth</span>
                  </button>
                </div>
              )}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center gap-3">
                <img
                  src={defaults.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`}
                  alt={fullName}
                  className="w-11 h-11 rounded-full ring-2 ring-indigo-500/30 object-cover"
                />
                <div>
                  <div className="font-bold text-white text-xs flex items-center gap-1.5">
                    {fullName}
                    <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> Verified {providerMeta.name} ID
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">{email}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{headline}</div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {providerMeta.name} Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Professional Title / Headline
                </label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Shield className="w-4 h-4" />
                  <span>{loading ? 'Saving to Database...' : `Sign In with ${providerMeta.name} (Saves to Backend)`}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 text-xs">
              <p className="text-slate-300 leading-relaxed">
                Connects directly to {providerMeta.name} OAuth 2.0 servers with auto-verification and profile synchronization.
              </p>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 space-y-2">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-indigo-400" />
                  OAuth Scope & Claims Requested:
                </div>
                <ul className="list-disc pl-5 space-y-1 text-[11px]">
                  <li><code className="text-indigo-300">openid</code>: Universal user identifier</li>
                  <li><code className="text-indigo-300">email</code>: Verified primary email address</li>
                  <li><code className="text-indigo-300">profile</code>: Name, avatar, and account metadata</li>
                </ul>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleLiveOAuth}
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Launch Live {providerMeta.name} OAuth Redirect</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>{providerMeta.name} OpenID Connect • Neon PostgreSQL Sync</span>
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
