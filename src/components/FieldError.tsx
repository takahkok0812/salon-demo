/** 項目ごとのエラー表示。入力欄の aria-describedby から読み上げられるよう id を付ける */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <small id={id} className="field-error" role="alert">
      {message}
    </small>
  );
}
