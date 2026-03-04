import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Application error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-8 transition-colors" role="alert">
          <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-premium-xl border border-slate-200/60 dark:border-slate-700/60 p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-100 to-rose-50 dark:from-rose-900/30 dark:to-rose-950/30 flex items-center justify-center mx-auto mb-5">
              <AlertTriangle size={32} className="text-rose-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Something went wrong</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
              An unexpected error occurred. Please try again or refresh the page.
            </p>
            {this.state.error && (
              <pre className="text-xs text-left bg-slate-100 dark:bg-slate-700 p-4 rounded-xl mb-6 overflow-auto max-h-32 text-rose-700 dark:text-rose-400 font-mono border border-slate-200/60 dark:border-slate-600">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="btn-primary text-white px-5 py-2.5 rounded-lg flex items-center gap-2 font-medium"
              >
                <RotateCcw size={16} strokeWidth={1.75} /> Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 px-5 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition font-medium"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
