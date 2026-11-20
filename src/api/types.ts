import type { Booking, BookingStatus, Customer, Role } from '../types';

/** 権限はデモ用にリクエストヘッダーで伝える（本番では認証トークンから判定する） */
export const ROLE_HEADER = 'x-demo-role';

export type BookingInput = Omit<Booking, 'id'>;
export type CustomerInput = Omit<Customer, 'id' | 'createdAt'>;

export interface StatusInput {
  status: BookingStatus;
}

export interface ApiErrorBody {
  code: string;
  message: string;
}

export type { Role };
