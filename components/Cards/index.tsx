import React from 'react';

import './style.scss';

interface CardProps
  extends React.PropsWithChildren<{
    badge?: string;
    href?: string;
    icon?: string;
    iconColor?: string;
    target?: string;
    title?: string;
  }> {}

export const Card = ({ badge,children, href, icon, iconColor, target, title }: CardProps) => {
  const Tag = href ? 'a' : 'div';
  return (
    <Tag className="rm-Card" href={href} target={target}>
      {icon && <i className={`rm-Card-icon fa-duotone fa-solid ${icon}`} style={{ '--Card-icon-color': iconColor } as React.CSSProperties}></i>}
      {title && (
        <div className="rm-Card-title">
          {title}
          {badge && <span className="rm-Card-badge">{badge}</span>}
          {href && <i aria-hidden="true" className="rm-Card-arrow fa-regular fa-arrow-right" />}
        </div>
      )}
      <div className="rm-Card-content">{children}</div>
    </Tag>
  );
};

interface CardsGripProps extends React.PropsWithChildren<{ columns?: number }> {}

const CardsGrid = ({ columns = 2, children }: CardsGripProps) => {
  // eslint-disable-next-line no-param-reassign
  columns = columns >= 2 ? columns : 2;
  return (
    <div className="rm-CardsGrid" style={{ '--CardsGrid-template-columns': columns } as React.CSSProperties}>
      {children}
    </div>
  );
};

export default CardsGrid;
