/**
 * Error Boundary
 *
 * Component for the AIfacilitator application.
 */
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorId: string;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorId: '',
    };

    public static getDerivedStateFromError(error: Error): Partial<State> {
        const errorId = `ERR-${Date.now().toString(36).toUpperCase()}`;
        return { hasError: true, error, errorId };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // In production, this would send to an error tracking service like Sentry
        console.error(`[ErrorBoundary] ${this.state.errorId}:`, error, errorInfo);

        // Stale asset detection: after a Vercel/Vite redeploy the hashed JS chunk
        // filenames change.  If the browser has the old HTML (with old chunk URLs)
        // cached, dynamic imports will fail with a TypeError about loading a module.
        // The fix is a single hard reload — the new HTML will reference the new chunks.
        const isStaleAsset =
            error instanceof TypeError &&
            (
                error.message.includes('dynamically imported module') ||
                error.message.includes('Failed to fetch dynamically imported module') ||
                error.message.includes('error loading dynamically imported module')
            );
        if (isStaleAsset) {
            // Avoid reload loops: only reload once per session for this error type.
            const reloadKey = 'stale_asset_reload';
            if (!sessionStorage.getItem(reloadKey)) {
                sessionStorage.setItem(reloadKey, '1');
                window.location.reload();
            }
        }
    }

    private handleReload = () => {
        window.location.reload();
    };

    private handleGoHome = () => {
        window.location.href = '/';
    };

    public render() {
        if (this.state.hasError) {
            const isDev = import.meta.env.DEV;

            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                    <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center space-y-6">
                        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                            <AlertTriangle className="h-8 w-8 text-red-600" />
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
                            <p className="text-gray-500">
                                We apologize for the inconvenience. The application has encountered an unexpected error.
                            </p>
                        </div>

                        {/* Show error details only in development */}
                        {isDev && this.state.error && (
                            <div className="p-4 bg-red-50 rounded-lg text-left overflow-auto max-h-40">
                                <p className="text-xs font-mono text-red-800 break-all">
                                    {this.state.error.toString()}
                                </p>
                            </div>
                        )}

                        {/* Show error ID for support reference */}
                        <p className="text-xs text-gray-400">
                            Error Reference: {this.state.errorId}
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Button onClick={this.handleReload} className="gap-2">
                                <RefreshCw className="h-4 w-4" />
                                Reload Page
                            </Button>
                            <Button variant="outline" onClick={this.handleGoHome} className="gap-2">
                                <Home className="h-4 w-4" />
                                Go Home
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
