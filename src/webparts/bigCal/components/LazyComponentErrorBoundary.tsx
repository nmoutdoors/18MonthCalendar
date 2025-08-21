import * as React from 'react';
import { MessageBar, MessageBarType } from '@fluentui/react';
import { Logger } from '../services/LoggingService';

interface ILazyComponentErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  componentName?: string;
}

interface ILazyComponentErrorBoundaryProps {
  componentName: string;
  fallbackMessage?: string;
  children: React.ReactNode;
}

/**
 * Error boundary specifically for lazy loaded components
 * Provides graceful fallback when lazy components fail to load
 */
export class LazyComponentErrorBoundary extends React.Component<
  ILazyComponentErrorBoundaryProps,
  ILazyComponentErrorBoundaryState
> {
  constructor(props: ILazyComponentErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(error: Error): ILazyComponentErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    Logger.error(`Lazy component ${this.props.componentName} failed to load`, error);

    this.setState({
      componentName: this.props.componentName,
      error
    });
  }

  public render(): React.ReactNode {
    if (this.state.hasError) {
      const fallbackMessage = this.props.fallbackMessage || 
        `Failed to load ${this.props.componentName}. Please refresh the page to try again.`;

      return (
        <MessageBar
          messageBarType={MessageBarType.error}
          isMultiline={true}
          dismissButtonAriaLabel="Close"
          onDismiss={() => this.setState({ hasError: false })}
        >
          <strong>Component Loading Error</strong>
          <br />
          {fallbackMessage}
          {this.state.error && (
            <details style={{ marginTop: '8px' }}>
              <summary>Technical Details</summary>
              <pre style={{ fontSize: '12px', marginTop: '4px' }}>
                {this.state.error.message}
              </pre>
            </details>
          )}
        </MessageBar>
      );
    }

    return this.props.children;
  }
}
