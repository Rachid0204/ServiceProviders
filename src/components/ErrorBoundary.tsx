import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'Unexpected application error',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught application error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let parsedDetails: { error?: string; operationType?: string; path?: string } | null = null;
      try {
        parsedDetails = JSON.parse(this.state.errorMessage);
      } catch {
        parsedDetails = null;
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 text-rose-700 mb-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h1 className="text-lg font-semibold text-slate-900">
                Erreur de sécurité ou de connexion / خطأ في الاتصال
              </h1>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              {parsedDetails?.error || this.state.errorMessage}
            </p>
            {parsedDetails?.path && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-mono-tabular text-slate-700 mb-4">
                <div>Operation: {parsedDetails.operationType}</div>
                <div>Path: {parsedDetails.path}</div>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, errorMessage: '' });
                window.location.reload();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Recharger l’application / إعادة التحميل</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
