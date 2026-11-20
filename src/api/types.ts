import type { BookingStatus, Role } from '../types';
export type { BookingInput, CustomerInput } from '../domain/schemas';

/** 権限はデモ用にリクエストヘッダーで伝える（本番では認証トークンから判定する） */
export const ROLE_HEADER = 'x-demo-role';


export interface StatusInput {
  status: BookingStatus;
}

export interface ApiErrorBody {
  code: string;
  message: string;
}

export type { Role };
