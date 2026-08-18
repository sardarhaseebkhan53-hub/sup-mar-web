import { Component, type ErrorInfo, type ReactNode } from 'react';
import Logo from './Logo';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional fallback renderer. Defaults to a branded recovery screen. */
  fallback?: (reset: () => void) => ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Catches render/child errors so a failure in one route or component does not
 * destroy the whole application. Logs to the console for diagnostics and lets
 * the user recover without a full data loss.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Never capture passwords or form contents — only the error message/stack.
    console.error('[qavlio:error-boundary]', error.message);
    this.props.onError?.(error, info);
  }

  private reset = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback(this.reset);

    return (
      <main className="grid min-h-screen place-items-center bg-ink-950 px-4 text-white">
        <div className="max-w-md text-center">
          <Logo inverse className="mb-10 justify-center" />
          <h1 className="text-3xl font-extrabold">Something went wrong</h1>
          <p className="mt-3 text-sm leading-6 text-white/55">
            An unexpected error interrupted this view. Your account and data are safe — reload to continue.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={this.reset}
              className="rounded-control bg-gold-400 px-5 py-3 text-xs font-extrabold text-ink-950 hover:bg-gold-300"
            >
              Try again
            </button>
            <a href="/" className="rounded-control border border-white/15 bg-white/10 px-5 py-3 text-xs font-extrabold text-white hover:bg-white/15">
              Back to home
            </a>
          </div>
        </div>
      </main>
    );
  }
}
