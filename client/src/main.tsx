import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';
import './index.css';
import App from './App.tsx';

const storedDomain = typeof window !== 'undefined' ? localStorage.getItem('hustlex_auth0_domain') : null;
const storedClientId = typeof window !== 'undefined' ? localStorage.getItem('hustlex_auth0_client_id') : null;

const auth0Domain = storedDomain || import.meta.env.VITE_AUTH0_DOMAIN || 'dev-hustlex.us.auth0.com';
const auth0ClientId = storedClientId || import.meta.env.VITE_AUTH0_CLIENT_ID || 'client-id-placeholder';

const isGitHubCallback =
  typeof window !== 'undefined' &&
  (window.location.search.includes('state=github_oauth') ||
   (window.location.search.includes('code=') && !window.location.search.includes('state=')));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Auth0Provider
      domain={auth0Domain}
      clientId={auth0ClientId}
      authorizationParams={{
        redirect_uri: typeof window !== 'undefined' ? window.location.origin : '',
      }}
      skipRedirectCallback={isGitHubCallback || window.location.search.includes('code=') === false}
    >
      <App />
    </Auth0Provider>
  </StrictMode>,
);
