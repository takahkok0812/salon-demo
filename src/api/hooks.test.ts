import { describe, expect, it } from 'vitest';
import type { Booking } from '../types';
import { withStatus } from './hooks';

const b = (id: string, status: Booking['status']): Booking => ({
  id, customerId: 'c1', staffId: 's1', menuId: 'm1', start: '2026-11-25T01:00:00.000Z', minutes: 60, status, memo: '',
});

describe('withStatus（楽観的更新で使う）', () => {
  it('指定した予約だけ状態を変え、元の配列は変えない', () => {
    const list = [b('b1', 'reserved'), b('b2', 'reserved')];
    const next = withStatus(list, 'b1', 'visited');
    expect(next?.map((x) => x.status)).toEqual(['visited', 'reserved']);
    expect(list[0].status).toBe('reserved');
  });

  it('まだ一覧を取得していなければ undefined のまま', () => {
    expect(withStatus(undefined, 'b1', 'visited')).toBeUndefined();
  });
});
