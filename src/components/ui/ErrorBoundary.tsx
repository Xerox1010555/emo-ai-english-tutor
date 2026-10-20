import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Changing this resets the boundary — used to clear a broken screen. */
  screenKey?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches a render-time crash in one screen instead of blanking the whole app.
 * The rest of the app (auth, navigation) keeps working.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (prevProps.screenKey !== this.props.screenKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ui] render error:', error, info.componentStack);
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="px-5 py-10">
        <div className="glass rounded-2xl p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-warning-500/10 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6 text-warning-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">This screen ran into a problem</h2>
            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
              Your progress is safe. Reload the screen to continue.
            </p>
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Try again
          </button>
        </div>
      </div>
    );
  }
}
