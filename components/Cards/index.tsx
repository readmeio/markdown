import React from 'react';

import Icon from '../Icon';

import './style.scss';

interface CardProps
  extends React.PropsWithChildren<{
    // Optional link component wrapper so that the link can be formatted & processed by the parent
    LinkComponent?: React.ElementType;
    badge?: string;
    href?: string;
    icon?: string;
    iconColor?: string;
    kind?: 'card' | 'tile';
    target?: string;
    title?: string;
  }> {}

export const Card = ({
  badge,
  children,
  href,
  kind = 'card',
  icon,
  iconColor,
  LinkComponent = 'a',
  target,
  title,
}: CardProps) => {
  const Tag = href ? LinkComponent : 'div';

  return (
    <Tag className={`Card Card_${kind}`} href={href} target={target}>
      {icon && <Icon className="Card-icon" icon={icon} iconColor={iconColor} />}
      <div className="Card-content">
        {title && (
          <div className="Card-title">
            {title}
            {badge && <span className="Card-badge">{badge}</span>}
            {href && <i aria-hidden="true" className="Card-arrow fa-regular fa-arrow-right" />}
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
    <div className="CardsGrid" style={{ '--CardsGrid-cardWidth': cardWidth, '--CardsGrid-columns': columns } as React.CSSProperties}>
      {children}
    </div>
  );
};

export default CardsGrid;
