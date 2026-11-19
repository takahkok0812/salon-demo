import { useEffect, useState } from 'react';
import type { Booking, Role } from './types';
import { ROLE_LABEL } from './types';
import { useStore } from './store';
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
  const { state, dispatch } = useStore();
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
            <select value={state.role} onChange={(e) => dispatch({ type: 'setRole', role: e.target.value as Role })}>
              {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                <option key={r} value={r}>{ROLE_LABEL[r]}</option>
              ))}
            </select>
          </label>
          <button
            className="ghost small"
            onClick={() => {
              dispatch({ type: 'reset' });
              setToast('サンプルデータに戻しました');
            }}
          >
            データを初期化
          </button>
        </div>
      </header>

      <main>
        {view === 'dashboard' && <DashboardView onOpen={(b) => open(b)} />}
        {view === 'calendar' && <CalendarView onOpen={open} />}
        {view === 'customers' && <CustomersView onToast={setToast} />}
      </main>

      <footer className="foot">
        画面はReact + TypeScriptで作成したデモです。データはこのブラウザ内にだけ保存されます。
        本番構成ではAWS（API Gateway・Lambda・DynamoDB）に保存し、AI機能はClaude APIで生成します。
      </footer>

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
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
