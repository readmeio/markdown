import type { PropsWithChildren } from 'react';
import React from 'react';
interface Props {
    error?: string;
}
interface State {
    hasError: boolean;
    message?: string;
}
declare class RenderError extends React.Component<PropsWithChildren<Props>, State> {
    state: {
        hasError: boolean;
        message: any;
    };
    static getDerivedStateFromError(error: Error): {
        hasError: boolean;
        message: string;
    };
    static componentDidCatch(error: Error, info: {
        componentStack: string;
    }): void;
    render(): string | number | boolean | Iterable<React.ReactNode> | React.JSX.Element;
}
export default RenderError;
