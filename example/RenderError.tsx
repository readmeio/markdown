import React, { PropsWithChildren } from 'react';

interface Props {
  error?: string;
}

interface State {
  hasError: boolean;
  message?: string;
}

class RenderError extends React.Component<PropsWithChildren<Props>, State> {
  state = { hasError: false, message: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: `${error.message}${error.stack}` };
  }

  componentDidCatch(error: any, info: { componentStack: any }) {
    console.error(error, info.componentStack);
  }

  render() {
    const { children, error } = this.props;
    const { hasError, message } = this.state;

    return hasError || error ? (
      <div className="error">
        <pre>
          <code>{message || error}</code>
        </pre>
      </div>
    ) : (
      children
    );
  }
}

export default RenderError;
