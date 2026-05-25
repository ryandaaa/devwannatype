import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="flex-1 flex items-center justify-center bg-background p-lg">
        <div className="max-w-[480px] flex flex-col gap-md">
          <div className="font-headline-sm text-headline-sm text-on-surface">
            something went wrong
          </div>
          <pre className="font-code text-body-sm text-on-surface-variant overflow-auto whitespace-pre-wrap border border-surface-container-high p-md max-h-[200px]">
            {error.message}
          </pre>
          <div className="flex items-center gap-sm">
            <button
              type="button"
              onClick={this.reset}
              className="px-md py-xs border border-surface-container-high hover:border-outline-variant font-code text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
            >
              try again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-md py-xs border border-surface-container-high hover:border-outline-variant font-code text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
            >
              reload window
            </button>
          </div>
        </div>
      </div>
    );
  }
}
