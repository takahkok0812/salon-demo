import { useMutation, useQueryClient, useSuspenseQueries } from '@tanstack/react-query';
import type { AppData, Booking, BookingStatus, Customer, Menu, Staff } from '../types';
import { api } from './client';
import type { BookingInput, CustomerInput } from './types';

export const keys = {
  staff: ['staff'] as const,
  menus: ['menus'] as const,
  customers: ['customers'] as const,
  bookings: ['bookings'] as const,
};

/**
 * 画面が使うデータをまとめて取得する。
 * 4つのAPIを並列に呼び、すべて揃うまでは Suspense で読み込み中を表示する。
 */
export function useAppData(): AppData {
  const [staff, menus, customers, bookings] = useSuspenseQueries({
    queries: [
      { queryKey: keys.staff, queryFn: () => api<Staff[]>('staff'), staleTime: Infinity },
      { queryKey: keys.menus, queryFn: () => api<Menu[]>('menus'), staleTime: Infinity },
      { queryKey: keys.customers, queryFn: () => api<Customer[]>('customers') },
      { queryKey: keys.bookings, queryFn: () => api<Booking[]>('bookings') },
    ],
  });
  return { staff: staff.data, menus: menus.data, customers: customers.data, bookings: bookings.data };
}

/** 新規（id が空）なら POST、既存なら PUT */
export function useSaveBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Booking) =>
      id ? api<Booking>(`bookings/${id}`, { method: 'PUT', body: input satisfies BookingInput }) : api<Booking>('bookings', { method: 'POST', body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.bookings }),
  });
}

/** 予約一覧の中の1件だけ状態を書き換えた新しい配列を返す（楽観的更新で使う） */
export function withStatus(list: Booking[] | undefined, id: string, status: BookingStatus): Booking[] | undefined {
  return list?.map((b) => (b.id === id ? { ...b, status } : b));
}

/**
 * 予約の状態を変える。APIの応答を待たずに画面を先に変え（楽観的更新）、
 * 失敗したら元に戻す。最後にサーバーの内容で取り直して、画面とサーバーを必ずそろえる。
 */
export function useSetBookingStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: BookingStatus }) =>
      api<Booking>(`bookings/${id}/status`, { method: 'PATCH', body: { status } }),
    onMutate: async ({ id, status }) => {
      // 取得中のデータが後から届いて、先に書き換えた表示を上書きしないように止める
      await qc.cancelQueries({ queryKey: keys.bookings });
      const previous = qc.getQueryData<Booking[]>(keys.bookings);
      qc.setQueryData<Booking[]>(keys.bookings, (old) => withStatus(old, id, status));
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) qc.setQueryData(keys.bookings, context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.bookings }),
  });
}

export function useDeleteBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`bookings/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.bookings }),
  });
}

/** 新規（id が空）なら POST、既存なら PUT。保存後のお客様（採番済みの id を含む）を返す */
export function useSaveCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, createdAt: _createdAt, ...input }: Customer) =>
      id
        ? api<Customer>(`customers/${id}`, { method: 'PUT', body: input satisfies CustomerInput })
        : api<Customer>('customers', { method: 'POST', body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.customers }),
  });
}

export function useImportCustomers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (customers: CustomerInput[]) =>
      api<{ imported: number }>('customers/import', { method: 'POST', body: customers }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.customers }),
  });
}

export function useResetData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>('reset', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries(),
  });
}
