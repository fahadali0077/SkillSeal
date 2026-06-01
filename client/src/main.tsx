import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: { queries:{ staleTime:5*60*1000, retry:1, refetchOnWindowFocus:false }, mutations:{ retry:0 } },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
          <Toaster
            position="top-right"
            gutter={10}
            toastOptions={{
              duration: 4000,
              style: {
                borderRadius: '14px',
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(12px)',
                color: '#111827',
                fontSize: '14px',
                fontWeight: 500,
                padding: '12px 16px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
                maxWidth: '420px',
              },
              success: {
                iconTheme: { primary: '#10b981', secondary: '#fff' },
                style: { borderLeft: '4px solid #10b981' },
              },
              error: {
                iconTheme: { primary: '#ef4444', secondary: '#fff' },
                style: { borderLeft: '4px solid #ef4444' },
                duration: 5000,
              },
              loading: {
                iconTheme: { primary: '#2563eb', secondary: '#fff' },
                style: { borderLeft: '4px solid #2563eb' },
              },
            }}
          />
        </BrowserRouter>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
