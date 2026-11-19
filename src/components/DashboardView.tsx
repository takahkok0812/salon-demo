import type { Booking } from '../types';
import { STATUS_LABEL } from '../types';
import { useStore } from '../store';
import { addDays, fmtDate, fmtDateLong, fmtTime, sameDay, startOfDay, startOfWeek, yen } from '../lib/date';
import { visitStats } from '../lib/ai';

interface Props {
  onOpen: (booking: Booking) => void;
}

export function DashboardView({ onOpen }: Props) {
  const { state, dispatch } = useStore();
  const { data, role } = state;
  const isAdmin = role === 'admin';
  const now = new Date();
  const today = startOfDay(now);
  const weekStart = startOfWeek(now);
  const weekEnd = addDays(weekStart, 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const active = data.bookings.filter((b) => b.status !== 'cancelled');
  const todays = active
    .filter((b) => sameDay(new Date(b.start), today))
    .sort((a, b) => a.start.localeCompare(b.start));
  const weekCount = active.filter((b) => {
    const s = new Date(b.start);
    return s >= weekStart && s < weekEnd;
  }).length;
  const monthSales = data.bookings
    .filter((b) => b.status === 'visited' && new Date(b.start) >= monthStart && new Date(b.start) <= now)
    .reduce((sum, b) => sum + (data.menus.find((m) => m.id === b.menuId)?.price ?? 0), 0);
  const cancelRate = (() => {
    const past = data.bookings.filter((b) => new Date(b.start) < now);
    if (!past.length) return 0;
    return Math.round((past.filter((b) => b.status === 'cancelled').length / past.length) * 100);
  })();

  // 来店間隔を過ぎていて、先の予約がないお客様（フォロー候補）
  const followUps = data.customers
    .map((c) => ({ c, s: visitStats(data, c.id) }))
    .filter(({ c, s }) => {
      if (!s.last || !s.intervalDays) return false;
      const due = new Date(new Date(s.last.start).getTime() + s.intervalDays * 86400000);
      const hasFuture = data.bookings.some((b) => b.customerId === c.id && b.status === 'reserved' && new Date(b.start) > now);
      return due < now && !hasFuture;
    })
    .slice(0, 6);

  return (
    <section className="dash">
      <div className="kpis">
        <div className="kpi">
          <span>今日の予約</span>
          <b>{todays.length}<small>件</small></b>
        </div>
        <div className="kpi">
          <span>今週の予約</span>
          <b>{weekCount}<small>件</small></b>
        </div>
        <div className="kpi">
          <span>今月の売上（来店済み）</span>
          <b>{isAdmin ? yen(monthSales) : '—'}</b>
          {!isAdmin && <small className="muted">管理者のみ表示</small>}
        </div>
        <div className="kpi">
          <span>キャンセル率（過去分）</span>
          <b>{cancelRate}<small>%</small></b>
        </div>
      </div>

      <div className="two">
        <div className="panel">
          <h2>今日の予約　<small>{fmtDateLong(today)}</small></h2>
          {todays.length === 0 && <p className="empty">今日の予約はありません{today.getDay() === 2 ? '（定休日）' : ''}</p>}
          <ul className="today">
            {todays.map((b) => {
              const c = data.customers.find((x) => x.id === b.customerId);
              const m = data.menus.find((x) => x.id === b.menuId);
              const s = data.staff.find((x) => x.id === b.staffId)!;
              const start = new Date(b.start);
              return (
                <li key={b.id}>
                  <span className="dot" style={{ background: s.color }} />
                  <button className="link" onClick={() => onOpen(b)}>
                    <b>{fmtTime(start)}</b> {c?.name} 様 ・ {m?.name} ・ 担当 {s.name}
                  </button>
                  <span className={`tag ${b.status}`}>{STATUS_LABEL[b.status]}</span>
                  {b.status === 'reserved' && start <= now && (
                    <button className="ghost small" onClick={() => dispatch({ type: 'setStatus', id: b.id, status: 'visited' })}>
                      来店済みにする
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="panel">
          <h2>フォロー候補</h2>
          <p className="hint">いつもの来店間隔を過ぎていて、次の予約がないお客様です。</p>
          {followUps.length === 0 && <p className="empty">いまはありません</p>}
          <ul className="today">
            {followUps.map(({ c, s }) => (
              <li key={c.id}>
                <span className="dot" />
                <span>
                  <b>{c.name}</b> 様 ・ 前回 {fmtDate(new Date(s.last!.start))} ・ 間隔 約{s.intervalDays}日
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
