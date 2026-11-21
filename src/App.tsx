import { Suspense, useEffect, useState } from 'react';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import type { Booking, Role } from './types';
import { ROLE_LABEL } from './types';
import { useRole } from './role';
import { useResetData } from './api/hooks';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DashboardView } from './components/DashboardView';
import { CalendarView } from './components/CalendarView';
import { CustomersView } from './components/CustomersView';
import { BookingModal } from './components/BookingModal';

type View = 'dashboard' | 'calendar' | 'customers';

const NAV: { id: View; label: string }[] = [
  { id: 'dashboard', label: 'ダッシュボード' },
  { id: 'calendar', label: '予約カレンダー' },
  { id: 'customers', label: '顧客管理' },
];

interface ModalState {
  booking: Booking | null;
  start?: Date;
  staffId?: string;
}

export default function App() {
  const { role, setRole } = useRole();
  const reset = useResetData();
  const [view, setView] = useState<View>('dashboard');
  const [modal, setModal] = useState<ModalState | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const open = (booking: Booking | null, start?: Date, staffId?: string) => setModal({ booking, start, staffId });

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="logo">S</span>
          <div>
            <b>サロン予約・顧客管理</b>
            <small>デモ版（架空データ）</small>
          </div>
        </div>
        <nav>
          {NAV.map((n) => (
            <button key={n.id} className={view === n.id ? 'tab on' : 'tab'} onClick={() => setView(n.id)}>
              {n.label}
            </button>
          ))}
        </nav>
        <div className="who">
          <label>
            ログイン中の権限
            <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                <option key={r} value={r}>{ROLE_LABEL[r]}</option>
              ))}
            </select>
          </label>
          <button
            className="ghost small"
            disabled={reset.isPending}
            onClick={() =>
              reset.mutate(undefined, {
                onSuccess: () => setToast('サンプルデータに戻しました'),
                onError: (e) => setToast(e.message),
              })
            }
          >
            データを初期化
          </button>
        </div>
      </header>

      <main>
        <QueryErrorResetBoundary>
          {({ reset: resetQueries }) => (
            <ErrorBoundary onReset={resetQueries}>
              <Suspense fallback={<p className="panel state-box" role="status">読み込み中…</p>}>
                {view === 'dashboard' && <DashboardView onOpen={(b) => open(b)} onToast={setToast} />}
                {view === 'calendar' && <CalendarView onOpen={open} />}
                {view === 'customers' && <CustomersView onToast={setToast} />}
                {modal && (
                  <BookingModal
                    booking={modal.booking}
                    defaultStart={modal.start}
                    defaultStaffId={modal.staffId}
                    onClose={() => setModal(null)}
                    onSaved={(msg) => {
                      setModal(null);
                      setToast(msg);
                    }}
                    onToast={setToast}
                  />
                )}
              </Suspense>
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </main>

      <footer className="foot">
        画面はReact + TypeScriptで作成したデモです。データは擬似API（MSW）を通してこのブラウザ内にだけ保存されます。
        本番構成ではAWS（API Gateway・Lambda・DynamoDB）に保存し、AI機能はClaude APIで生成します。
      </footer>

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
