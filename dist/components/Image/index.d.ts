import * as React from 'react';
interface ImageProps {
    align?: string;
    alt?: string;
    border?: boolean | string;
    caption?: string;
    children?: [React.ReactElement];
    className?: string;
    height?: string;
    lazy?: boolean;
    src: string;
    title?: string;
    width?: string;
}
declare const Image: (Props: ImageProps) => React.JSX.Element;
export default Image;
