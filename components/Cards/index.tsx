import React from 'react';

import Icon from '../Icon';
import { noTranslateTagsToSpans } from '../NoTranslate';

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

  const normalizedTitle = noTranslateTagsToSpans(title);

  return (
    <Tag className={`Card Card_${kind}`} href={href} target={target}>
      {icon && <Icon className="Card-icon" icon={icon} iconColor={iconColor} />}
      <div className="Card-content">
        {title && (
          <div className="Card-title">
            {normalizedTitle}
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

// max() can't take keyword widths like auto or min-content, so only wrap a length or a math expression
const canWrapColumns = (columns: number | string, cardWidth: string) =>
  Number(columns) > 0 && /^(\.?\d|(calc|min|max|clamp)\()/.test(cardWidth);

const CardsGrid = ({ cardWidth = '200px', columns = 'auto-fit', children }: CardsGridProps) => {
  const className = canWrapColumns(columns, cardWidth) ? 'CardsGrid CardsGrid_wrap' : 'CardsGrid';

  return (
    <div className={className} style={{ '--CardsGrid-cardWidth': cardWidth, '--CardsGrid-columns': columns } as React.CSSProperties}>
      {children}
    </div>
  );
};

export default CardsGrid;
