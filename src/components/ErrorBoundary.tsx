import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('NEOKO Uncaught Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorStr = this.state.error ? this.state.error.toString() : '';
      const isChunkError = /Failed to fetch dynamically imported module|Loading chunk|Importing a module script failed/i.test(errorStr);

      return (
        <div className="min-h-screen bg-[#0c0c14] text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#161327] border border-[#2b2746] rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center space-y-6 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-[#9d86e9]/10 border border-[#9d86e9]/30 text-[#9d86e9] flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold font-display text-white tracking-tight">
                {isChunkError ? 'App Updated / Reconnected' : 'Something went wrong'}
              </h2>
              <p className="text-xs text-[#7c779b] leading-relaxed">
                {isChunkError
                  ? 'A new version of Neoko is available or your network connection was briefly interrupted. Please reload to continue.'
                  : "An unexpected error occurred while rendering this component. We've captured the error log."}
              </p>
            </div>

            {this.state.error && (
              <div className="bg-[#120f23] border border-[#2b2746] rounded-xl p-3 text-left overflow-x-auto max-h-32">
                <p className="text-[11px] font-mono text-red-400 break-all">
                  {errorStr}
                </p>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={this.handleGoHome}
                className="flex-1 px-4 py-3 rounded-xl bg-[#231f3d] hover:bg-[#2b2746] text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-[#2b2746] transition-all cursor-pointer"
              >
                <Home className="w-4 h-4 text-[#9d86e9]" />
                <span>Go Home</span>
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 px-4 py-3 rounded-xl bg-[#9d86e9] hover:bg-[#8b70e5] text-[#0c0c14] text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#9d86e9]/20 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{isChunkError ? 'Reload & Update' : 'Reload App'}</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
