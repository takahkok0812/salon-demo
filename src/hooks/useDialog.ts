import { useEffect, useRef } from 'react';

/**
 * ダイアログのキーボード操作をそろえる。
 * - 開いたらダイアログの最初の入力欄（なければダイアログ自体）にフォーカスを移す
 * - Esc キーで閉じる
 * - Tab キーのフォーカスをダイアログの中で循環させる
 * - 閉じたら、開く前にフォーカスがあった要素に戻す
 */
export function useDialog<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const el = ref.current;
    if (!el) return;
    const focusables = () =>
      [...el.querySelectorAll<HTMLElement>('input, select, textarea, button, [href], [tabindex]:not([tabindex="-1"])')].filter(
        (x) => !x.hasAttribute('disabled') && x.offsetParent !== null,
      );
    const first = focusables().find((x) => x.matches('input, select, textarea'));
    (first ?? el).focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const list = focusables();
      if (list.length === 0) return;
      const [head, tail] = [list[0], list[list.length - 1]];
      if (e.shiftKey && document.activeElement === head) {
        e.preventDefault();
        tail.focus();
      } else if (!e.shiftKey && document.activeElement === tail) {
        e.preventDefault();
        head.focus();
      }
    }
    el.addEventListener('keydown', onKey);
    return () => {
      el.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, []);

  return ref;
}
