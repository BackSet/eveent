import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <h2 className="text-lg font-semibold">Algo salió mal</h2>
          <p className="text-sm text-muted-foreground">Ocurrió un error inesperado</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="text-primary underline text-sm font-medium"
          >
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
