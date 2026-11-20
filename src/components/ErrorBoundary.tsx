import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message || 'An unexpected rendering error occurred.',
    };
  }

  componentDidCatch(error: Error) {
    console.error('PRATYAKSHA UI ErrorBoundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#080D18] text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-[#111D2E] border border-red-500/30 rounded-lg p-6">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h2 className="text-base font-semibold">Command Module Recovery</h2>
            </div>
            <p className="mt-3 text-sm text-slate-300 leading-relaxed">
              A component encountered an unexpected state error. Your server pipeline and saved
              reports remain intact.
            </p>
            <pre className="mt-3 p-3 bg-[#080D18] border border-slate-800 rounded text-xs font-mono text-slate-400 overflow-x-auto">
              {this.state.message}
            </pre>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 rounded-md hover:bg-cyan-500/25 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reload Command Center
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
