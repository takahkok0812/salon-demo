import { useMemo, useState } from 'react';
import type { Booking } from '../types';
import { useAppData } from '../api/hooks';
import { CLOSE_HOUR, OPEN_HOUR, SLOT_MIN, addDays, fmtDate, fmtTime, sameDay, startOfWeek } from '../lib/date';

const SLOT_PX = 30;

interface Props {
  onOpen: (booking: Booking | null, start?: Date, staffId?: string) => void;
}

export function CalendarView({ onOpen }: Props) {
  const data = useAppData();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const [showCancelled, setShowCancelled] = useState(false);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const slots = useMemo(() => {
    const list: { h: number; m: number }[] = [];
    for (let t = OPEN_HOUR * 60; t < CLOSE_HOUR * 60; t += SLOT_MIN) list.push({ h: Math.floor(t / 60), m: t % 60 });
    return list;
  }, []);

  const weekEnd = addDays(weekStart, 7);
  const visible = data.bookings.filter((b) => {
    const s = new Date(b.start);
    if (s < weekStart || s >= weekEnd) return false;
    if (staffFilter !== 'all' && b.staffId !== staffFilter) return false;
    if (!showCancelled && b.status === 'cancelled') return false;
    return true;
  });

  const today = new Date();

  return (
    <section className="panel">
      <div className="toolbar">
        <button className="ghost" onClick={() => setWeekStart(addDays(weekStart, -7))}>← 前の週</button>
        <button className="ghost" onClick={() => setWeekStart(startOfWeek(new Date()))}>今週</button>
        <button className="ghost" onClick={() => setWeekStart(addDays(weekStart, 7))}>次の週 →</button>
        <strong className="range">
          {fmtDate(days[0])} 〜 {fmtDate(days[6])}
        </strong>
        <span className="spacer" />
        <div className="chips">
          <button className={staffFilter === 'all' ? 'chip on' : 'chip'} onClick={() => setStaffFilter('all')}>全員</button>
          {data.staff.map((s) => (
            <button
              key={s.id}
              className={staffFilter === s.id ? 'chip on' : 'chip'}
              style={{ borderColor: s.color }}
              onClick={() => setStaffFilter(s.id)}
            >
              <i style={{ background: s.color }} />
              {s.name}
            </button>
          ))}
        </div>
        <label className="check">
          <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} />
          キャンセルも表示
        </label>
        <button className="primary" onClick={() => onOpen(null, undefined, staffFilter === 'all' ? undefined : staffFilter)}>
          ＋ 予約を登録
        </button>
      </div>

      <div className="calendar-scroll">
      <div className="calendar" style={{ gridTemplateColumns: `56px repeat(7, 1fr)` }}>
        <div className="corner" />
        {days.map((d) => (
          <div key={d.toISOString()} className={`dayhead${sameDay(d, today) ? ' today' : ''}${d.getDay() === 2 ? ' closed' : ''}`}>
            {fmtDate(d)}
            {d.getDay() === 2 && <small>定休日</small>}
          </div>
        ))}

        <div className="times">
          {slots.map((s) => (
            <div key={`${s.h}${s.m}`} className="time" style={{ height: SLOT_PX }}>
              {s.m === 0 ? `${s.h}:00` : ''}
            </div>
          ))}
        </div>

        {days.map((d) => {
          const dayBookings = visible.filter((b) => sameDay(new Date(b.start), d));
          const staffIds = staffFilter === 'all' ? data.staff.map((s) => s.id) : [staffFilter];
          const laneWidth = 100 / staffIds.length;
          return (
            <div key={d.toISOString()} className={`daycol${d.getDay() === 2 ? ' closed' : ''}`}>
              {slots.map((s) => {
                const start = new Date(d);
                start.setHours(s.h, s.m, 0, 0);
                return (
                  <button
                    key={`${s.h}${s.m}`}
                    className={`slot${s.m === 0 ? ' hour' : ''}`}
                    style={{ height: SLOT_PX }}
                    disabled={d.getDay() === 2}
                    aria-label={`${fmtDate(d)} ${fmtTime(start)} に予約を追加`}
                    onClick={() => onOpen(null, start, staffFilter === 'all' ? undefined : staffFilter)}
                  />
                );
              })}
              {dayBookings.map((b) => {
                const s = new Date(b.start);
                const top = ((s.getHours() * 60 + s.getMinutes() - OPEN_HOUR * 60) / SLOT_MIN) * SLOT_PX;
                const height = (b.minutes / SLOT_MIN) * SLOT_PX - 2;
                const lane = Math.max(0, staffIds.indexOf(b.staffId));
                const staff = data.staff.find((x) => x.id === b.staffId)!;
                const customer = data.customers.find((c) => c.id === b.customerId);
                const menu = data.menus.find((m) => m.id === b.menuId);
                return (
                  <button
                    key={b.id}
                    className={`booking ${b.status}`}
                    style={{
                      top,
                      height,
                      left: `calc(${lane * laneWidth}% + 2px)`,
                      width: `calc(${laneWidth}% - 4px)`,
                      borderLeftColor: staff.color,
                      background: b.status === 'cancelled' ? undefined : `${staff.color}1f`,
                    }}
                    onClick={() => onOpen(b)}
                    title={`${fmtTime(s)} ${customer?.name ?? ''} / ${menu?.name ?? ''} / 担当 ${staff.name}`}
                  >
                    <b>{fmtTime(s)}</b>
                    {height > 40 && <span>{staffIds.length > 1 ? (customer?.name ?? '').split(' ')[0] : customer?.name}</span>}
                    {height > 70 && <small>{menu?.name}</small>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
      </div>
      <p className="hint">空いている枠をクリックすると、その時間で予約を登録できます。担当者ごとに色分けしています。スマホでは横にスクロールできます。</p>
    </section>
  );
}
