import React from 'react';
import './style.scss';
interface Props extends React.PropsWithChildren<{
    icon?: string;
    iconColor?: string;
    title: string;
}> {
}
declare const Accordion: ({ children, icon, iconColor, title }: Props) => React.JSX.Element;
export default Accordion;
