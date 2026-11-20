import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from './App';
import { RoleProvider } from './role';
import { worker } from './mocks/browser';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

async function start() {
  // 擬似API（MSW）を先に起動してから画面を描く。GitHub Pages のサブパスでも動くよう相対パスで登録する
  await worker.start({
    serviceWorker: { url: './mockServiceWorker.js', options: { scope: './' } },
    onUnhandledFrame: 'bypass',
    quiet: true,
  });
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RoleProvider>
          <App />
        </RoleProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}

void start();
