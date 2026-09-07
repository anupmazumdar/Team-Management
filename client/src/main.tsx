import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';
import './index.css';
import App from './App.tsx';

const auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN || 'dev-hustlex.us.auth0.com';
const auth0ClientId = import.meta.env.VITE_AUTH0_CLIENT_ID || 'client-id-placeholder';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Auth0Provider
      domain={auth0Domain}
      clientId={auth0ClientId}
      authorizationParams={{
        redirect_uri: typeof window !== 'undefined' ? window.location.origin : '',
      }}
      skipRedirectCallback={window.location.search.includes('code=') === false}
    >
      <App />
    </Auth0Provider>
  </StrictMode>,
);
