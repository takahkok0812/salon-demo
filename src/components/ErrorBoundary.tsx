import { Component, type ReactNode } from 'react';

interface Props {
  onReset: () => void;
  children: ReactNode;
}

/** データの取得に失敗したときに、画面全体を壊さず再試行できるようにする */
export class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <section className="panel state-box" role="alert">
        <p>データを読み込めませんでした。{this.state.error.message}</p>
        <button
          className="primary"
          onClick={() => {
            this.props.onReset();
            this.setState({ error: null });
          }}
        >
          もう一度読み込む
        </button>
      </section>
    );
  }
}
