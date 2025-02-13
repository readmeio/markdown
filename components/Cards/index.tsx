import React from 'react';

import './style.scss';

interface CardProps
  extends React.PropsWithChildren<{
    href?: string;
    icon?: string;
    iconColor?: string;
    target?: string;
    title?: string;
  }> {}

export const Card = ({ children, href, icon, iconColor, target, title }: CardProps) => {
  const Tag = href ? 'a' : 'div';
  return (
    <Tag className="Card" href={href} target={target}>
      {icon && <i className={`Card-icon fa-duotone fa-solid ${icon}`} style={{ color: `${iconColor}` }}></i>}
      {title && <p className="Card-title">{title}</p>}
      <div className="Card-content">{children}</div>
    </Tag>
  );
};

interface CardsGripProps extends React.PropsWithChildren<{ columns?: number }> {}

const CardsGrid = ({ columns = 2, children }: CardsGripProps) => {
  // eslint-disable-next-line no-param-reassign
  columns = columns >= 2 ? columns : 2;
  return (
    <div className="CardsGrid" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {children}
    </div>
  );
};

export default CardsGrid;
