import * as React from 'react';
interface Props extends React.PropsWithChildren<React.HTMLAttributes<HTMLQuoteElement>> {
    attributes?: Record<string, unknown>;
    empty?: boolean;
    icon?: string;
    theme?: string;
}
export declare const themes: Record<string, string>;
export declare const defaultIcons: {
    info: string;
    warn: string;
    okay: string;
    error: string;
};
declare const Callout: (props: Props) => React.JSX.Element;
export default Callout;
