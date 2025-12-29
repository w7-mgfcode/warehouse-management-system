import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV;

      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="text-center space-y-4 max-w-2xl">
            <AlertTriangle className="h-12 w-12 text-error mx-auto" />
            <h1 className="text-2xl font-bold">Hiba történt</h1>
            <p className="text-muted-foreground">
              Váratlan hiba történt az alkalmazásban.
            </p>

            {/* Show error details in development */}
            {isDev && this.state.error && (
              <div className="mt-4 p-4 bg-muted rounded-lg text-left">
                <p className="font-mono text-sm text-destructive">
                  {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <pre className="mt-2 text-xs text-muted-foreground overflow-auto max-h-64">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}

            <Button onClick={() => window.location.reload()}>
              Újratöltés
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
