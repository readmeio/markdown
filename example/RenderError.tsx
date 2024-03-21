import React from 'react';

interface Props {}

interface State {
  hasError: boolean;
  message?: string;
}

class RenderError extends React.Component<Props, State> {
  state = { hasError: false, message: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: `${error.message}${error.stack}` };
  }

  componentDidCatch(error: any, info: { componentStack: any }) {
    console.error(error, info.componentStack);
  }

  render() {
    const { children } = this.props;
    const { hasError, message } = this.state;

    return hasError ? (
      <div className="error">
        <pre>
          <code>{message}</code>
        </pre>
      </div>
    ) : (
      children
    );
  }
}

export default RenderError;
