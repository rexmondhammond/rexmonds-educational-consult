import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  label?: string;
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
    console.error("[Rexmond] render error", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="m-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-red-100">
        <h2 className="text-lg font-bold">Something went wrong{this.props.label ? ` in ${this.props.label}` : ""}.</h2>
        <p className="mt-2 text-sm text-red-200/80">{this.state.error.message}</p>
        <button
          className="mt-4 min-h-11 rounded-xl bg-red-500 px-4 text-sm font-semibold text-white"
          onClick={() => this.setState({ error: null })}
        >
          Try again
        </button>
      </div>
    );
  }
}
