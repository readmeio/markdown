import React from 'react';
export declare function getHref(href: string, baseUrl: string): string;
interface Props {
    children: React.ReactNode;
    download?: string;
    href?: string;
    target?: string;
    title?: string;
}
declare function Anchor(props: Props): React.JSX.Element;
export default Anchor;
