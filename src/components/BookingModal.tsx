import { useMemo, useState } from 'react';
import type { Booking, BookingStatus } from '../types';
import { STATUS_LABEL } from '../types';
import { useAppData, useDeleteBooking, useSaveBooking } from '../api/hooks';
import { useRole } from '../role';
import { fromLocalInput, toLocalInput } from '../lib/date';
import { validateBooking } from '../domain/booking';
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
  const data = useAppData();
  const { role } = useRole();
  const saveBooking = useSaveBooking();
  const deleteBooking = useDeleteBooking();
  const busy = saveBooking.isPending || deleteBooking.isPending;
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
      id: booking?.id ?? '', // 新規は空。採番は擬似API側で行う
      customerId,
      staffId,
      menuId,
      start: fromLocalInput(start).toISOString(),
      minutes: menu.minutes,
      status,
      memo: memo.trim(),
    };
  }

  function save() {
    const b = build();
    const err = validateBooking(b, data);
    if (err) {
      setError(err.message);
      return;
    }
    // 画面で確認したルールは、擬似API側でも同じ関数で確認される（別の人が同じ枠を先に取った場合など）
    saveBooking.mutate(b, {
      onSuccess: () => onSaved(booking ? '予約を更新しました' : '予約を登録しました'),
      onError: (e) => setError(e.message),
    });
  }

  function remove() {
    if (!booking) return;
    deleteBooking.mutate(booking.id, {
      onSuccess: () => onSaved('予約を削除しました'),
      onError: (e) => setError(e.message),
    });
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
            <button className="danger" onClick={remove} disabled={busy}>削除</button>
          )}
          <span className="spacer" />
          <button className="ghost" onClick={onClose}>キャンセル</button>
          <button className="primary" onClick={save} disabled={busy}>{saveBooking.isPending ? '保存中…' : '保存'}</button>
        </div>
      </div>
    </div>
  );
}
