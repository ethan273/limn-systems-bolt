'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export class DesignBoardErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Design Board Error:', error);
    console.error('Error Info:', errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen bg-[#f7f7f7] flex items-center justify-center">
          <Card className="p-8 max-w-md mx-auto">
            <CardContent className="text-center">
              <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Design Board Loading Issue</h3>
              <p className="text-slate-600 font-medium mb-4">
                The design board encountered a loading error. This is often temporary with complex canvas libraries.
              </p>
              <div className="space-y-2">
                <Button onClick={this.handleRetry} className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = '/dashboard/design-board-beta'}
                  className="w-full"
                >
                  Back to Board List
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}