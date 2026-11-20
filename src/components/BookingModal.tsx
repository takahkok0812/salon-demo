import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Booking, BookingStatus } from '../types';
import { STATUS_LABEL } from '../types';
import { useAppData, useDeleteBooking, useSaveBooking } from '../api/hooks';
import { useRole } from '../role';
import { fromLocalInput, toLocalInput } from '../lib/date';
import { validateBooking, type BookingErrorCode } from '../domain/booking';
import { bookingFormSchema, type BookingFormValues } from '../domain/schemas';
import { draftConfirmation } from '../lib/ai';
import { FieldError } from './FieldError';
import { useDialog } from '../hooks/useDialog';

interface Props {
  booking: Booking | null; // null = 新規
  defaultStart?: Date;
  defaultStaffId?: string;
  onClose: () => void;
  onSaved: (message: string) => void;
  onToast: (message: string) => void;
}

/** 業務ルールのエラーを、どの項目の下に出すか */
const ERROR_FIELD: Record<BookingErrorCode, keyof BookingFormValues> = {
  noCustomer: 'customerId',
  invalidDate: 'start',
  closedDay: 'start',
  outsideHours: 'start',
  overlap: 'start',
};

export function BookingModal({ booking, defaultStart, defaultStaffId, onClose, onSaved, onToast }: Props) {
  const data = useAppData();
  const { role } = useRole();
  const saveBooking = useSaveBooking();
  const deleteBooking = useDeleteBooking();
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const dialogRef = useDialog<HTMLDivElement>(onClose);

  const {
    register,
    handleSubmit,
    getValues,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      customerId: booking?.customerId ?? '',
      staffId: booking?.staffId ?? defaultStaffId ?? data.staff[0].id,
      menuId: booking?.menuId ?? data.menus[0].id,
      start: toLocalInput(booking ? new Date(booking.start) : (defaultStart ?? new Date())),
      status: booking?.status ?? 'reserved',
      memo: booking?.memo ?? '',
    },
  });
  const busy = isSubmitting || deleteBooking.isPending;

  const candidates = useMemo(() => {
    const q = query.trim();
    const list = q
      ? data.customers.filter((c) => c.name.includes(q) || c.kana.includes(q) || c.phone.includes(q))
      : data.customers;
    return list.slice(0, 50);
  }, [data.customers, query]);

  function toBooking(v: BookingFormValues): Booking {
    const menu = data.menus.find((m) => m.id === v.menuId);
    return {
      id: booking?.id ?? '', // 新規は空。採番は擬似API側で行う
      customerId: v.customerId,
      staffId: v.staffId,
      menuId: v.menuId,
      start: fromLocalInput(v.start).toISOString(),
      minutes: menu?.minutes ?? 0,
      status: v.status,
      memo: v.memo,
    };
  }

  const onSubmit = handleSubmit(async (values) => {
    const b = toBooking(values);
    // 形と長さは Zod（resolver）で確認済み。ここではほかの予約を見て決まる業務ルールを確認する
    const err = validateBooking(b, data);
    if (err) {
      setError(ERROR_FIELD[err.code], { message: err.message }, { shouldFocus: true });
      return;
    }
    // 同じルールは擬似API側でも確認される（別の人が同じ枠を先に取った場合など）
    try {
      await saveBooking.mutateAsync(b);
      onSaved(booking ? '予約を更新しました' : '予約を登録しました');
    } catch (e) {
      setError('root', { message: (e as Error).message });
    }
  });

  function remove() {
    if (!booking) return;
    deleteBooking.mutate(booking.id, {
      onSuccess: () => onSaved('予約を削除しました'),
      onError: (e) => setError('root', { message: e.message }),
    });
  }

  function makeDraft() {
    const values = getValues();
    if (!values.customerId) {
      setError('customerId', { message: 'お客様を選ぶと、確認メッセージの下書きを作れます。' });
      return;
    }
    clearErrors('customerId');
    setDraft(draftConfirmation(data, toBooking(values)));
  }

  const invalid = (name: keyof BookingFormValues) => ({
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `booking-${name}-error` : undefined,
  });

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div ref={dialogRef} tabIndex={-1} className="modal" role="dialog" aria-modal="true" aria-label="予約の編集" onMouseDown={(e) => e.stopPropagation()}>
        <form onSubmit={onSubmit} noValidate>
          <div className="modal-head">
            <h2>{booking ? '予約を編集' : '予約を登録'}</h2>
            <button type="button" className="icon" onClick={onClose} aria-label="閉じる">×</button>
          </div>

          <label className="field">
            <span>お客様</span>
            <input placeholder="名前・カナ・電話番号で検索" value={query} onChange={(e) => setQuery(e.target.value)} />
            <select size={4} {...register('customerId')} {...invalid('customerId')}>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}（{c.kana}）
                </option>
              ))}
            </select>
            <FieldError id="booking-customerId-error" message={errors.customerId?.message} />
          </label>

          <div className="grid2">
            <label className="field">
              <span>担当</span>
              <select {...register('staffId')} {...invalid('staffId')}>
                {data.staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <FieldError id="booking-staffId-error" message={errors.staffId?.message} />
            </label>
            <label className="field">
              <span>メニュー</span>
              <select {...register('menuId')} {...invalid('menuId')}>
                {data.menus.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}（{m.minutes}分{role === 'admin' ? `・${m.price.toLocaleString('ja-JP')}円` : ''}）
                  </option>
                ))}
              </select>
              <FieldError id="booking-menuId-error" message={errors.menuId?.message} />
            </label>
            <label className="field">
              <span>開始日時</span>
              <input type="datetime-local" step={1800} {...register('start')} {...invalid('start')} />
              <FieldError id="booking-start-error" message={errors.start?.message} />
            </label>
            <label className="field">
              <span>状態</span>
              <select {...register('status')} {...invalid('status')}>
                {(Object.keys(STATUS_LABEL) as BookingStatus[]).map((k) => (
                  <option key={k} value={k}>{STATUS_LABEL[k]}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="field">
            <span>メモ</span>
            <textarea rows={2} placeholder="要望・注意点など" {...register('memo')} {...invalid('memo')} />
            <FieldError id="booking-memo-error" message={errors.memo?.message} />
          </label>

          {errors.root && <p className="error" role="alert">{errors.root.message}</p>}

          <div className="ai-box">
            <div className="ai-head">
              <span className="badge-ai">AI</span>
              <span>予約確認メッセージの下書き</span>
              <button type="button" className="ghost" onClick={makeDraft}>作成する</button>
            </div>
            {draft && (
              <>
                <textarea className="draft" rows={9} value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="確認メッセージの下書き" />
                <button
                  type="button"
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
              <button type="button" className="danger" onClick={remove} disabled={busy}>削除</button>
            )}
            <span className="spacer" />
            <button type="button" className="ghost" onClick={onClose}>キャンセル</button>
            <button type="submit" className="primary" disabled={busy}>{isSubmitting ? '保存中…' : '保存'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
