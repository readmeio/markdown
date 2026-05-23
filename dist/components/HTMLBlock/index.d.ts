import React from 'react';
interface Props {
    children?: React.ReactElement | string;
    html?: string;
    runScripts?: boolean | string;
    safeMode?: boolean | string;
}
declare const HTMLBlock: ({ children, html: htmlProp, runScripts, safeMode: safeModeRaw }: Props) => React.JSX.Element;
export default HTMLBlock;
