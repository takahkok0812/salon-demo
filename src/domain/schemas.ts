import { z } from 'zod';

/**
 * 入力のルール（形と長さ）。画面のフォームと擬似APIの両方で同じスキーマを使う。
 * 予約の重なりなど、ほかのデータを見ないと決まらないルールは domain/booking.ts の validateBooking で確認する。
 */

const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label}は${max}文字以内で入力してください`);

export const customerInputSchema = z.object({
  name: z.string().trim().min(1, '氏名を入力してください').max(50, '氏名は50文字以内で入力してください'),
  kana: z
    .string()
    .trim()
    .regex(/^[ァ-ヶー\s　]*$/, 'フリガナはカタカナで入力してください')
    .max(50, 'フリガナは50文字以内で入力してください'),
  phone: z
    .string()
    .trim()
    .regex(/^$|^0\d{1,4}-?\d{1,4}-?\d{3,4}$/, '電話番号は「090-1234-5678」の形で入力してください'),
  email: z.union([z.literal(''), z.email('メールアドレスの形式が正しくありません')]),
  note: optionalText(500, '接客メモ'),
});

export type CustomerInput = z.infer<typeof customerInputSchema>;

export const bookingStatusSchema = z.enum(['reserved', 'visited', 'cancelled'], '状態が正しくありません');

export const bookingInputSchema = z.object({
  customerId: z.string().min(1, 'お客様を選んでください'),
  staffId: z.string().min(1, '担当者を選んでください'),
  menuId: z.string().min(1, 'メニューを選んでください'),
  start: z.iso.datetime({ message: '日時を正しく入力してください' }),
  minutes: z.number().int().positive(),
  status: bookingStatusSchema,
  memo: optionalText(200, 'メモ'),
});

export type BookingInput = z.infer<typeof bookingInputSchema>;

/** 予約フォーム（画面）の入力。日時は <input type="datetime-local"> の文字列のまま扱う */
export const bookingFormSchema = z.object({
  customerId: z.string().min(1, 'お客様を選んでください'),
  staffId: z.string().min(1, '担当者を選んでください'),
  menuId: z.string().min(1, 'メニューを選んでください'),
  start: z.string().refine((v) => v !== '' && !Number.isNaN(new Date(v).getTime()), '日時を正しく入力してください'),
  status: bookingStatusSchema,
  memo: optionalText(200, 'メモ'),
});

export type BookingFormValues = z.infer<typeof bookingFormSchema>;

/** スキーマの検証結果から、最初のエラーメッセージを1つ取り出す（APIの 422 用） */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? '入力内容が正しくありません';
}
