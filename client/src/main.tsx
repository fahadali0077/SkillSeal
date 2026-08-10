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
                color: '#0A1520',
                fontSize: '14px',
                fontWeight: 500,
                padding: '12px 16px',
                boxShadow: '0 8px 32px rgba(14,26,43,0.04), 0 0 0 1px rgba(14,26,43,0.04)',
                maxWidth: '420px',
              },
              success: {
                iconTheme: { primary: '#1D7A4C', secondary: '#fff' },
                style: { borderLeft: '4px solid #1D7A4C' },
              },
              error: {
                iconTheme: { primary: '#A3221B', secondary: '#fff' },
                style: { borderLeft: '4px solid #A3221B' },
                duration: 5000,
              },
              loading: {
                iconTheme: { primary: '#12233A', secondary: '#fff' },
                style: { borderLeft: '4px solid #12233A' },
              },
            }}
          />
        </BrowserRouter>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
