import { HttpResponse, delay, http } from 'msw';
import type { Booking, Customer, Role } from '../types';
import { bookingInputSchema, bookingStatusSchema, customerInputSchema, firstIssue } from '../domain/schemas';
import { validateBooking } from '../domain/booking';
import { commit, db, newId, resetDb } from './db';
import { ROLE_HEADER, type ApiErrorBody } from './types';

/**
 * 擬似API（MSW）。本番構成では API Gateway + Lambda が受け持つ部分。
 * 業務ルールの検証と権限の確認は、画面だけでなくここでも必ず行う。
 */

const LATENCY_MS = 150;

function error(status: number, code: string, message: string) {
  return HttpResponse.json<ApiErrorBody>({ code, message }, { status });
}

function roleOf(request: Request): Role {
  return request.headers.get(ROLE_HEADER) === 'admin' ? 'admin' : 'staff';
}

const forbidden = () => error(403, 'forbidden', 'この操作は管理者のみ行えます。');

/**
 * 予約の入力を検証する。形と長さは Zod のスキーマ（画面のフォームと共通）、
 * 重なり・営業時間などの業務ルールは validateBooking（画面と共通）で確認する。
 */
async function parseBooking(request: Request, id: string): Promise<{ booking: Booking } | { response: Response }> {
  const parsed = bookingInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return { response: error(422, 'invalid', firstIssue(parsed.error)) };
  const booking: Booking = { ...parsed.data, id };
  const data = db();
  if (!data.staff.some((s) => s.id === booking.staffId)) return { response: error(422, 'invalid', '担当者が見つかりません。') };
  if (!data.menus.some((m) => m.id === booking.menuId)) return { response: error(422, 'invalid', 'メニューが見つかりません。') };
  const err = validateBooking(booking, data);
  return err ? { response: error(422, err.code, err.message) } : { booking };
}

export const handlers = [
  http.get('*/api/staff', async () => {
    await delay(LATENCY_MS);
    return HttpResponse.json(db().staff);
  }),

  http.get('*/api/menus', async () => {
    await delay(LATENCY_MS);
    return HttpResponse.json(db().menus);
  }),

  http.get('*/api/customers', async () => {
    await delay(LATENCY_MS);
    return HttpResponse.json(db().customers);
  }),

  http.get('*/api/bookings', async () => {
    await delay(LATENCY_MS);
    return HttpResponse.json(db().bookings);
  }),

  http.post('*/api/bookings', async ({ request }) => {
    await delay(LATENCY_MS);
    const result = await parseBooking(request, newId('b'));
    if ('response' in result) return result.response;
    const { booking } = result;
    const data = db();
    commit({ ...data, bookings: [...data.bookings, booking] });
    return HttpResponse.json(booking, { status: 201 });
  }),

  http.put('*/api/bookings/:id', async ({ request, params }) => {
    await delay(LATENCY_MS);
    const data = db();
    if (!data.bookings.some((b) => b.id === params.id)) return error(404, 'notFound', '予約が見つかりません。');
    const result = await parseBooking(request, String(params.id));
    if ('response' in result) return result.response;
    const { booking } = result;
    commit({ ...data, bookings: data.bookings.map((b) => (b.id === booking.id ? booking : b)) });
    return HttpResponse.json(booking);
  }),

  http.patch('*/api/bookings/:id/status', async ({ request, params }) => {
    await delay(LATENCY_MS);
    const data = db();
    const current = data.bookings.find((b) => b.id === params.id);
    if (!current) return error(404, 'notFound', '予約が見つかりません。');
    const parsed = bookingStatusSchema.safeParse(((await request.json().catch(() => null)) as { status?: unknown } | null)?.status);
    if (!parsed.success) return error(422, 'invalid', firstIssue(parsed.error));
    const updated = { ...current, status: parsed.data };
    commit({ ...data, bookings: data.bookings.map((b) => (b.id === updated.id ? updated : b)) });
    return HttpResponse.json(updated);
  }),

  http.delete('*/api/bookings/:id', async ({ request, params }) => {
    await delay(LATENCY_MS);
    if (roleOf(request) !== 'admin') return forbidden();
    const data = db();
    if (!data.bookings.some((b) => b.id === params.id)) return error(404, 'notFound', '予約が見つかりません。');
    commit({ ...data, bookings: data.bookings.filter((b) => b.id !== params.id) });
    return new HttpResponse(null, { status: 204 });
  }),

  http.post('*/api/customers', async ({ request }) => {
    await delay(LATENCY_MS);
    const parsed = customerInputSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return error(422, 'invalid', firstIssue(parsed.error));
    const customer: Customer = { ...parsed.data, id: newId('c'), createdAt: new Date().toISOString() };
    const data = db();
    commit({ ...data, customers: [...data.customers, customer] });
    return HttpResponse.json(customer, { status: 201 });
  }),

  http.put('*/api/customers/:id', async ({ request, params }) => {
    await delay(LATENCY_MS);
    const data = db();
    const current = data.customers.find((c) => c.id === params.id);
    if (!current) return error(404, 'notFound', 'お客様が見つかりません。');
    const parsed = customerInputSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return error(422, 'invalid', firstIssue(parsed.error));
    const customer: Customer = { ...current, ...parsed.data, id: current.id };
    commit({ ...data, customers: data.customers.map((c) => (c.id === customer.id ? customer : c)) });
    return HttpResponse.json(customer);
  }),

  http.post('*/api/customers/import', async ({ request }) => {
    await delay(LATENCY_MS);
    if (roleOf(request) !== 'admin') return forbidden();
    const rows = await request.json().catch(() => null);
    if (!Array.isArray(rows)) return error(422, 'invalid', '取り込むデータの形式が正しくありません。');
    const now = new Date().toISOString();
    // 氏名が空の行は飛ばす。それ以外で形式が合わない行があれば、何行目かを返して全体を取り込まない
    const created: Customer[] = [];
    for (const [i, row] of rows.entries()) {
      if (!String((row as { name?: unknown })?.name ?? '').trim()) continue;
      const parsed = customerInputSchema.safeParse(row);
      if (!parsed.success) return error(422, 'invalid', `${i + 2}行目：${firstIssue(parsed.error)}`);
      created.push({ ...parsed.data, id: newId('c'), createdAt: now });
    }
    const data = db();
    commit({ ...data, customers: [...data.customers, ...created] });
    return HttpResponse.json({ imported: created.length }, { status: 201 });
  }),

  http.post('*/api/reset', async () => {
    await delay(LATENCY_MS);
    resetDb();
    return new HttpResponse(null, { status: 204 });
  }),
];
