import { HttpResponse, delay, http } from 'msw';
import type { Booking, BookingStatus, Customer, Role } from '../types';
import { validateBooking } from '../domain/booking';
import { commit, db, newId, resetDb } from './db';
import { ROLE_HEADER, type ApiErrorBody, type BookingInput, type CustomerInput, type StatusInput } from './types';

/**
 * 擬似API（MSW）。本番構成では API Gateway + Lambda が受け持つ部分。
 * 業務ルールの検証と権限の確認は、画面だけでなくここでも必ず行う。
 */

const LATENCY_MS = 150;
const STATUSES: BookingStatus[] = ['reserved', 'visited', 'cancelled'];

function error(status: number, code: string, message: string) {
  return HttpResponse.json<ApiErrorBody>({ code, message }, { status });
}

function roleOf(request: Request): Role {
  return request.headers.get(ROLE_HEADER) === 'admin' ? 'admin' : 'staff';
}

const forbidden = () => error(403, 'forbidden', 'この操作は管理者のみ行えます。');

function checkBooking(b: Booking) {
  const data = db();
  if (!data.staff.some((s) => s.id === b.staffId)) return error(422, 'invalid', '担当者が見つかりません。');
  if (!data.menus.some((m) => m.id === b.menuId)) return error(422, 'invalid', 'メニューが見つかりません。');
  if (!STATUSES.includes(b.status)) return error(422, 'invalid', '状態が正しくありません。');
  const err = validateBooking(b, data);
  return err ? error(422, err.code, err.message) : null;
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
    const input = (await request.json()) as BookingInput;
    const booking: Booking = { ...input, id: newId('b') };
    const invalid = checkBooking(booking);
    if (invalid) return invalid;
    const data = db();
    commit({ ...data, bookings: [...data.bookings, booking] });
    return HttpResponse.json(booking, { status: 201 });
  }),

  http.put('*/api/bookings/:id', async ({ request, params }) => {
    await delay(LATENCY_MS);
    const data = db();
    if (!data.bookings.some((b) => b.id === params.id)) return error(404, 'notFound', '予約が見つかりません。');
    const booking: Booking = { ...((await request.json()) as BookingInput), id: String(params.id) };
    const invalid = checkBooking(booking);
    if (invalid) return invalid;
    commit({ ...data, bookings: data.bookings.map((b) => (b.id === booking.id ? booking : b)) });
    return HttpResponse.json(booking);
  }),

  http.patch('*/api/bookings/:id/status', async ({ request, params }) => {
    await delay(LATENCY_MS);
    const data = db();
    const current = data.bookings.find((b) => b.id === params.id);
    if (!current) return error(404, 'notFound', '予約が見つかりません。');
    const { status } = (await request.json()) as StatusInput;
    if (!STATUSES.includes(status)) return error(422, 'invalid', '状態が正しくありません。');
    const updated = { ...current, status };
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
    const input = (await request.json()) as CustomerInput;
    if (!input.name?.trim()) return error(422, 'invalid', '氏名を入力してください。');
    const customer: Customer = { ...input, name: input.name.trim(), id: newId('c'), createdAt: new Date().toISOString() };
    const data = db();
    commit({ ...data, customers: [...data.customers, customer] });
    return HttpResponse.json(customer, { status: 201 });
  }),

  http.put('*/api/customers/:id', async ({ request, params }) => {
    await delay(LATENCY_MS);
    const data = db();
    const current = data.customers.find((c) => c.id === params.id);
    if (!current) return error(404, 'notFound', 'お客様が見つかりません。');
    const input = (await request.json()) as CustomerInput;
    if (!input.name?.trim()) return error(422, 'invalid', '氏名を入力してください。');
    const customer: Customer = { ...current, ...input, name: input.name.trim(), id: current.id };
    commit({ ...data, customers: data.customers.map((c) => (c.id === customer.id ? customer : c)) });
    return HttpResponse.json(customer);
  }),

  http.post('*/api/customers/import', async ({ request }) => {
    await delay(LATENCY_MS);
    if (roleOf(request) !== 'admin') return forbidden();
    const inputs = (await request.json()) as CustomerInput[];
    const now = new Date().toISOString();
    const created: Customer[] = inputs
      .filter((c) => c.name?.trim())
      .map((c) => ({ ...c, name: c.name.trim(), id: newId('c'), createdAt: now }));
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
