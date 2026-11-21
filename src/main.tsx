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

/** 擬似APIが起動できないとき（アプリ内ブラウザなど）の案内 */
function showUnsupported() {
  const root = document.getElementById('root')!;
  root.innerHTML =
    '<div class="loading"><b>このブラウザではデモを表示できません。</b><br>' +
    'デモはブラウザの中で動く擬似APIを使っています。LINEなどのアプリ内ブラウザでは動かないことがあるため、' +
    'Safari または Chrome で開き直してください。</div>';
}

async function start() {
  // 擬似API（MSW）を先に起動してから画面を描く。GitHub Pages のサブパスでも動くよう相対パスで登録する
  try {
    if (!('serviceWorker' in navigator)) throw new Error('Service Worker が使えません');
    await worker.start({
      serviceWorker: { url: './mockServiceWorker.js', options: { scope: './' } },
      onUnhandledFrame: 'bypass',
      quiet: true,
    });
  } catch {
    showUnsupported();
    return;
  }
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
