import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { clearAllData } from '@/data/db';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  showClearDialog: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, showClearDialog: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('ErrorBoundary', 'Uncaught error:', error, errorInfo);
  }

  private handleRefresh = () => {
    window.location.reload();
  };

  private handleClearDataClick = () => {
    this.setState({ showClearDialog: true });
  };

  private handleClearDataConfirm = async () => {
    await clearAllData();
    window.location.href = '/';
  };

  private handleClearDataCancel = () => {
    this.setState({ showClearDialog: false });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-svh items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-destructive/10 flex size-10 items-center justify-center rounded-full">
                  <AlertTriangle className="text-destructive size-5" />
                </div>
                <div>
                  <CardTitle>Something went wrong</CardTitle>
                  <CardDescription>
                    An unexpected error occurred. Your data is safe.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {this.state.error && import.meta.env.DEV && (
                <pre className="bg-muted overflow-auto rounded-md p-3 text-xs">
                  {this.state.error.message}
                </pre>
              )}
            </CardContent>
            <CardFooter className="gap-2">
              <Button onClick={this.handleRefresh} className="flex-1">
                <RefreshCw className="size-4" />
                Refresh
              </Button>
              <Button
                variant="destructive"
                onClick={this.handleClearDataClick}
                className="flex-1"
              >
                <Trash2 className="size-4" />
                Clear data
              </Button>
            </CardFooter>
          </Card>

          <AlertDialog
            open={this.state.showClearDialog}
            onOpenChange={(open) => this.setState({ showClearDialog: open })}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete all your financial data. This action cannot
                  be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={this.handleClearDataCancel}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction onClick={this.handleClearDataConfirm}>
                  Clear data
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      );
    }

    return this.props.children;
  }
}
