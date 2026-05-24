import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setupMockApiInterceptors } from './mockApi.ts';

// Initialize the client-side transparent mock API database interceptor
setupMockApiInterceptors();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
