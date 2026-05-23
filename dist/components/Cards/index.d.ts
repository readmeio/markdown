import React from 'react';
import './style.scss';
interface CardProps extends React.PropsWithChildren<{
    badge?: string;
    href?: string;
    icon?: string;
    iconColor?: string;
    kind?: 'card' | 'tile';
    target?: string;
    title?: string;
}> {
}
export declare const Card: ({ badge, children, href, kind, icon, iconColor, target, title }: CardProps) => React.JSX.Element;
interface CardsGridProps extends React.PropsWithChildren<{
    cardWidth?: string;
    columns?: number | string;
}> {
}
declare const CardsGrid: ({ cardWidth, columns, children }: CardsGridProps) => React.JSX.Element;
export default CardsGrid;
