import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Customer } from '../types';
import { customerInputSchema, type CustomerInput } from '../domain/schemas';
import { useSaveCustomer } from '../api/hooks';
import { FieldError } from './FieldError';
import { useDialog } from '../hooks/useDialog';
import { useRole } from '../role';

interface Props {
  customer: Customer; // id が空なら新規
  onClose: () => void;
  onSaved: (saved: Customer) => void;
}

/** 顧客情報の登録・編集。入力ルールは擬似APIと同じ Zod スキーマを使う */
export function CustomerFormModal({ customer, onClose, onSaved }: Props) {
  const saveCustomer = useSaveCustomer();
  // スタッフは既存のお客様の連絡先を見られない（APIからも伏せ字で届く）ので、編集もさせない
  const contactLocked = useRole().role === 'staff' && customer.id !== '';
  const dialogRef = useDialog<HTMLDivElement>(() => requestClose());
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CustomerInput>({
    resolver: zodResolver(customerInputSchema),
    defaultValues: {
      name: customer.name,
      kana: customer.kana,
      phone: contactLocked ? '' : customer.phone,
      email: contactLocked ? '' : customer.email,
      note: customer.note,
    },
  });

  const onSubmit = handleSubmit((values) =>
    saveCustomer
      .mutateAsync({ ...customer, ...values })
      .then(onSaved)
      .catch((e: Error) => setError('root', { message: e.message })),
  );

  const field = (name: keyof CustomerInput) => ({
    ...register(name),
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `customer-${name}-error` : undefined,
  });


  /** 入力途中で閉じると内容が消えるので、変更があれば確認してから閉じる */
  function requestClose() {
    if (isDirty && !window.confirm('入力した内容は保存されていません。閉じてよろしいですか？')) return;
    onClose();
  }
  return (
    <div className="overlay" onMouseDown={requestClose}>
      <div ref={dialogRef} tabIndex={-1} className="modal" role="dialog" aria-modal="true" aria-label="顧客情報" onMouseDown={(e) => e.stopPropagation()}>
        <form onSubmit={onSubmit} noValidate>
          <div className="modal-head">
            <h2>顧客情報</h2>
            <button type="button" className="icon" onClick={requestClose} aria-label="閉じる">×</button>
          </div>
          <div className="grid2">
            <label className="field"><span>氏名</span>
              <input {...field('name')} />
              <FieldError id="customer-name-error" message={errors.name?.message} />
            </label>
            <label className="field"><span>フリガナ</span>
              <input {...field('kana')} />
              <FieldError id="customer-kana-error" message={errors.kana?.message} />
            </label>
            {contactLocked ? (
              <>
                <label className="field"><span>電話番号</span>
                  <input type="tel" value={customer.phone} readOnly aria-readonly="true" />
                </label>
                <label className="field"><span>メール</span>
                  <input type="email" value={customer.email} readOnly aria-readonly="true" />
                </label>
              </>
            ) : (
              <>
                <label className="field"><span>電話番号</span>
                  <input type="tel" {...field('phone')} />
                  <FieldError id="customer-phone-error" message={errors.phone?.message} />
                </label>
                <label className="field"><span>メール</span>
                  <input type="email" {...field('email')} />
                  <FieldError id="customer-email-error" message={errors.email?.message} />
                </label>
              </>
            )}
          </div>
          {contactLocked && <p className="hint">連絡先の変更は管理者のみ行えます。</p>}
          <label className="field"><span>接客メモ</span>
            <textarea rows={3} {...field('note')} />
            <FieldError id="customer-note-error" message={errors.note?.message} />
          </label>
          {errors.root && <p className="error" role="alert">{errors.root.message}</p>}
          <div className="modal-foot">
            <span className="spacer" />
            <button type="button" className="ghost" onClick={requestClose}>キャンセル</button>
            <button type="submit" className="primary" disabled={isSubmitting}>{isSubmitting ? '保存中…' : '保存'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
