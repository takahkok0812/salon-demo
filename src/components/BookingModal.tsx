import { useMemo, useState } from 'react';
import type { Booking, BookingStatus } from '../types';
import { STATUS_LABEL } from '../types';
import { newId, useStore } from '../store';
import { CLOSE_HOUR, OPEN_HOUR, addMinutes, fmtTime, fromLocalInput, overlaps, toLocalInput } from '../lib/date';
import { draftConfirmation } from '../lib/ai';

interface Props {
  booking: Booking | null; // null = 新規
  defaultStart?: Date;
  defaultStaffId?: string;
  onClose: () => void;
  onSaved: (message: string) => void;
  onToast: (message: string) => void;
}

export function BookingModal({ booking, defaultStart, defaultStaffId, onClose, onSaved, onToast }: Props) {
  const { state, dispatch } = useStore();
  const { data, role } = state;
  const [customerId, setCustomerId] = useState(booking?.customerId ?? '');
  const [query, setQuery] = useState('');
  const [staffId, setStaffId] = useState(booking?.staffId ?? defaultStaffId ?? data.staff[0].id);
  const [menuId, setMenuId] = useState(booking?.menuId ?? data.menus[0].id);
  const [start, setStart] = useState(toLocalInput(booking ? new Date(booking.start) : (defaultStart ?? new Date())));
  const [status, setStatus] = useState<BookingStatus>(booking?.status ?? 'reserved');
  const [memo, setMemo] = useState(booking?.memo ?? '');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  const menu = data.menus.find((m) => m.id === menuId)!;
  const candidates = useMemo(() => {
    const q = query.trim();
    const list = q
      ? data.customers.filter((c) => c.name.includes(q) || c.kana.includes(q) || c.phone.includes(q))
      : data.customers;
    return list.slice(0, 50);
  }, [data.customers, query]);

  function build(): Booking {
    return {
      id: booking?.id ?? newId('b'),
      customerId,
      staffId,
      menuId,
      start: fromLocalInput(start).toISOString(),
      minutes: menu.minutes,
      status,
      memo: memo.trim(),
    };
  }

  function validate(b: Booking): string {
    if (!b.customerId) return 'お客様を選んでください。';
    const s = new Date(b.start);
    if (Number.isNaN(s.getTime())) return '日時を正しく入力してください。';
    if (s.getDay() === 2) return '火曜日は定休日です。';
    const end = addMinutes(s, b.minutes);
    const open = new Date(s);
    open.setHours(OPEN_HOUR, 0, 0, 0);
    const close = new Date(s);
    close.setHours(CLOSE_HOUR, 0, 0, 0);
    if (s < open || end > close) return `営業時間（${OPEN_HOUR}:00〜${CLOSE_HOUR}:00）内で予約してください。`;
    if (b.status !== 'cancelled') {
      const clash = data.bookings.find(
        (o) =>
          o.id !== b.id &&
          o.staffId === b.staffId &&
          o.status !== 'cancelled' &&
          overlaps(new Date(o.start), o.minutes, s, b.minutes),
      );
      if (clash) {
        const who = data.customers.find((c) => c.id === clash.customerId)?.name ?? '';
        return `担当者の予約が重なっています（${fmtTime(new Date(clash.start))}〜 ${who}様）。`;
      }
    }
    return '';
  }

  function save() {
    const b = build();
    const msg = validate(b);
    if (msg) {
      setError(msg);
      return;
    }
    dispatch({ type: 'saveBooking', booking: b });
    onSaved(booking ? '予約を更新しました' : '予約を登録しました');
  }

  function remove() {
    if (!booking) return;
    dispatch({ type: 'deleteBooking', id: booking.id });
    onSaved('予約を削除しました');
  }

  function makeDraft() {
    const b = build();
    if (!b.customerId) {
      setError('お客様を選ぶと、確認メッセージの下書きを作れます。');
      return;
    }
    setError('');
    setDraft(draftConfirmation(data, b));
  }

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal" role="dialog" aria-label="予約の編集" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{booking ? '予約を編集' : '予約を登録'}</h2>
          <button className="icon" onClick={onClose} aria-label="閉じる">×</button>
        </div>

        <label className="field">
          <span>お客様</span>
          <input placeholder="名前・カナ・電話番号で検索" value={query} onChange={(e) => setQuery(e.target.value)} />
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} size={4}>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}（{c.kana}）
              </option>
            ))}
          </select>
        </label>

        <div className="grid2">
          <label className="field">
            <span>担当</span>
            <select value={staffId} onChange={(e) => setStaffId(e.target.value)}>
              {data.staff.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>メニュー</span>
            <select value={menuId} onChange={(e) => setMenuId(e.target.value)}>
              {data.menus.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}（{m.minutes}分{role === 'admin' ? `・${m.price.toLocaleString('ja-JP')}円` : ''}）
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>開始日時</span>
            <input type="datetime-local" step={1800} value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className="field">
            <span>状態</span>
            <select value={status} onChange={(e) => setStatus(e.target.value as BookingStatus)}>
              {(Object.keys(STATUS_LABEL) as BookingStatus[]).map((k) => (
                <option key={k} value={k}>{STATUS_LABEL[k]}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span>メモ</span>
          <textarea rows={2} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="要望・注意点など" />
        </label>

        {error && <p className="error">{error}</p>}

        <div className="ai-box">
          <div className="ai-head">
            <span className="badge-ai">AI</span>
            <span>予約確認メッセージの下書き</span>
            <button className="ghost" onClick={makeDraft}>作成する</button>
          </div>
          {draft && (
            <>
              <textarea className="draft" rows={9} value={draft} onChange={(e) => setDraft(e.target.value)} />
              <button
                className="ghost"
                onClick={() => {
                  navigator.clipboard?.writeText(draft).then(
                    () => onToast('下書きをコピーしました'),
                    () => onToast('コピーできませんでした。テキストを選択してコピーしてください'),
                  );
                }}
              >
                コピー
              </button>
            </>
          )}
        </div>

        <div className="modal-foot">
          {booking && role === 'admin' && (
            <button className="danger" onClick={remove}>削除</button>
          )}
          <span className="spacer" />
          <button className="ghost" onClick={onClose}>キャンセル</button>
          <button className="primary" onClick={save}>保存</button>
        </div>
      </div>
    </div>
  );
}
