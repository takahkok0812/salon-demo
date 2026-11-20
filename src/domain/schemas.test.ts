import { describe, expect, it } from 'vitest';
import { bookingFormSchema, bookingInputSchema, customerInputSchema } from './schemas';

const customer = { name: '山田 花子', kana: 'ヤマダ ハナコ', phone: '090-1234-5678', email: 'hanako@example.com', note: '' };

describe('customerInputSchema', () => {
  it('正しい入力は通り、前後の空白を取り除く', () => {
    const r = customerInputSchema.parse({ ...customer, name: '  山田 花子 ' });
    expect(r.name).toBe('山田 花子');
  });

  it.each([
    ['氏名が空', { name: ' ' }, '氏名を入力してください'],
    ['フリガナがひらがな', { kana: 'やまだ' }, 'フリガナはカタカナで入力してください'],
    ['電話番号に文字', { phone: '090-abcd-5678' }, '電話番号は「090-1234-5678」の形で入力してください'],
    ['メールの形式違い', { email: 'hanako@' }, 'メールアドレスの形式が正しくありません'],
  ])('%s はエラー', (_, patch, message) => {
    const r = customerInputSchema.safeParse({ ...customer, ...patch });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe(message);
  });

  it('フリガナ・電話番号・メールは空でもよい', () => {
    expect(customerInputSchema.safeParse({ ...customer, kana: '', phone: '', email: '' }).success).toBe(true);
  });

  it('ハイフンなしの電話番号も受け付ける', () => {
    expect(customerInputSchema.safeParse({ ...customer, phone: '09012345678' }).success).toBe(true);
  });
});

describe('bookingInputSchema', () => {
  const booking = {
    customerId: 'c1', staffId: 's1', menuId: 'm1',
    start: '2026-11-23T04:00:00.000Z', minutes: 60, status: 'reserved', memo: '',
  };

  it('正しい入力は通る', () => {
    expect(bookingInputSchema.safeParse(booking).success).toBe(true);
  });

  it('日時がISO形式でなければエラー', () => {
    expect(bookingInputSchema.safeParse({ ...booking, start: '明日' }).success).toBe(false);
  });

  it('状態が想定外の値ならエラー', () => {
    expect(bookingInputSchema.safeParse({ ...booking, status: 'done' }).success).toBe(false);
  });
});

describe('bookingFormSchema', () => {
  it('お客様が未選択ならエラー', () => {
    const r = bookingFormSchema.safeParse({ customerId: '', staffId: 's1', menuId: 'm1', start: '2026-11-23T13:00', status: 'reserved', memo: '' });
    expect(r.error?.issues[0].message).toBe('お客様を選んでください');
  });
});
