import { Component, type ReactNode, type ErrorInfo } from 'react';
import { ShieldCheck, RefreshCw, AlertTriangle } from 'lucide-react';

interface Props  { children: ReactNode; fallback?: ReactNode; }
interface State  { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    const isHooksError = this.state.error.message?.includes('310') ||
                         this.state.error.message?.includes('hooks');

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-md p-10 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-red-50 border border-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <AlertTriangle size={24} className="text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h1>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            {isHooksError
              ? 'A rendering error occurred. This usually fixes itself after a page reload.'
              : 'An unexpected error occurred. Please try again.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={this.handleReload}
              className="flex items-center justify-center gap-2 bg-brand text-white font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-brand-dark transition-colors"
            >
              <RefreshCw size={14} /> Reload page
            </button>
            <button
              onClick={this.handleRetry}
              className="flex items-center justify-center gap-2 border border-gray-200 text-gray-700 font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors"
            >
              Try again
            </button>
          </div>
          <div className="mt-8 flex items-center justify-center gap-1.5 text-xs text-gray-400">
            <ShieldCheck size={12} className="text-brand" /> SkillSeal
          </div>
        </div>
      </div>
    );
  }
}
