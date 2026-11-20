import type { Role } from '../types';
import { ROLE_HEADER, type ApiErrorBody } from './types';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

let currentRole: Role = 'admin';

/** 画面で権限を切り替えたときに呼ぶ。以降のリクエストに権限が付く */
export function setApiRole(role: Role): void {
  currentRole = role;
}

/** ページの場所からの相対パスで呼ぶ（GitHub Pages のサブパスでも動くように） */
export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`api/${path}`, {
    method: init.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', [ROLE_HEADER]: currentRole },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(res.status, body?.code ?? 'unknown', body?.message ?? '通信に失敗しました。時間をおいてもう一度お試しください。');
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}
