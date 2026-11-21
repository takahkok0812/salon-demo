/** 連絡先の一部を伏せる（スタッフ権限で使う）。090-1234-5678 → 090****78 */
export function mask(s: string): string {
  if (!s) return '';
  return s.length <= 4 ? '****' : `${s.slice(0, 3)}****${s.slice(-2)}`;
}
