import { useDialog } from '../hooks/useDialog';

interface Props {
  csv: string;
  count: number;
  onClose: () => void;
  onToast: (message: string) => void;
}

export function CsvExportModal({ csv, count, onClose, onToast }: Props) {
  const dialogRef = useDialog<HTMLDivElement>(onClose);
  return (
    <div className="overlay" onMouseDown={onClose}>
      <div ref={dialogRef} tabIndex={-1} className="modal" role="dialog" aria-modal="true" aria-label="CSV書き出し" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>CSV書き出し（{count}件）</h2>
          <button className="icon" onClick={onClose} aria-label="閉じる">×</button>
        </div>
        <p className="hint">本番版ではファイルとしてダウンロードします。このデモでは内容をコピーして、表計算ソフトに貼り付けられます。</p>
        <textarea className="draft" rows={12} readOnly value={csv} aria-label="CSVの内容" />
        <div className="modal-foot">
          <span className="spacer" />
          <button
            className="primary"
            onClick={() => {
              navigator.clipboard?.writeText(csv).then(
                () => onToast('CSVをコピーしました'),
                () => onToast('コピーできませんでした。テキストを選択してコピーしてください'),
              );
            }}
          >
            コピー
          </button>
        </div>
      </div>
    </div>
  );
}
