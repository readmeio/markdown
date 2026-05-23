import React from 'react';
import './style.scss';
export declare const Column: ({ children }: React.PropsWithChildren) => React.JSX.Element;
interface Props extends React.PropsWithChildren<{
    layout?: '1fr' | 'auto' | 'fixed';
}> {
}
declare const Columns: ({ children, layout }: Props) => React.JSX.Element;
export default Columns;
