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
        <div className="min-h-screen bg-white text-black flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border-2 border-black p-8 shadow-[8px_8px_0px_#000]">
            <div className="flex items-center gap-3 text-[#FF0000]">
              <AlertTriangle className="w-6 h-6 shrink-0" aria-hidden="true" />
              <h2 className="text-lg font-black uppercase tracking-wider text-black">
                SYSTEM RECOVERY PROTOCOL
              </h2>
            </div>
            <p className="mt-4 text-sm text-[#4B5563] leading-relaxed">
              A module encountered an unexpected state error. Underlying pipeline telemetry and
              persisted documents remain safe.
            </p>
            <pre className="mt-4 p-4 bg-[#E5E7EB] border-2 border-black text-xs font-mono text-black overflow-x-auto">
              {this.state.message}
            </pre>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="button-sm mt-6 w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
              RELOAD COMMAND CENTER
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
