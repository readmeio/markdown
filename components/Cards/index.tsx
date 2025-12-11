import React from 'react';

import './style.scss';

interface CardProps
  extends React.PropsWithChildren<{
    badge?: string;
    href?: string;
    icon?: string;
    iconColor?: string;
    kind?: 'card' | 'tile';
    target?: string;
    title?: string;
  }> {}

export const Card = ({ badge, children, href, kind = 'card', icon, iconColor, target, title }: CardProps) => {
  const Tag = href ? 'a' : 'div';

  return (
    <Tag className={`rm-Card rm-Card_${kind}`} href={href} target={target}>
      {icon && <i className={`rm-Card-icon fa-duotone fa-solid ${icon}`} style={{ '--Card-icon-color': iconColor } as React.CSSProperties} />}
      <div className="rm-Card-content">
        {title && (
          <div className="rm-Card-title">
            {title}
            {badge && <span className="rm-Card-badge">{badge}</span>}
            {href && <i aria-hidden="true" className="rm-Card-arrow fa-regular fa-arrow-right" />}
          </div>
        )}
        {children}
      </div>
    </Tag>
  );
};

interface CardsGridProps extends React.PropsWithChildren<{ cardWidth?: string, columns?: number | string }> {}

const CardsGrid = ({ cardWidth = '200px', columns = 'auto-fit', children }: CardsGridProps) => {

  return (
    <div className="rm-CardsGrid" style={{ '--CardsGrid-cardWidth': cardWidth, '--CardsGrid-columns': columns } as React.CSSProperties}>
      {children}
    </div>
  );
};

export default CardsGrid;
