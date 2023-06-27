import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return null;
    }

    // eslint-disable-next-line react/prop-types
    return this.props.children;
  }
}
