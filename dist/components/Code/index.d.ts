import React from 'react';
interface CodeProps {
    children?: string[] | string;
    copyButtons?: boolean;
    lang?: string;
    meta?: string;
    theme?: string;
    value?: string;
}
declare const Code: (props: CodeProps) => string | React.JSX.Element;
export default Code;
