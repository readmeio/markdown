import React from 'react';
interface Props extends React.PropsWithChildren<{
    flow: boolean;
}> {
}
declare const TailwindRoot: ({ children, flow }: Props) => React.JSX.Element;
export default TailwindRoot;
