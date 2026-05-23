import React from 'react';
export type Depth = 1 | 2 | 3 | 4 | 5 | 6;
interface Props extends React.PropsWithChildren<React.HTMLAttributes<HTMLHeadingElement>> {
    depth: Depth;
    tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}
declare const CreateHeading: (depth: Depth) => (props: Props) => React.JSX.Element;
export default CreateHeading;
