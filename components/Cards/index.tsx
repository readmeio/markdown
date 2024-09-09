import React from 'react';

import './style.scss';

export const Card = ({ children, href, icon, iconColor, target, title }) => {
  const Tag = href ? 'a' : 'div';
  return (
    <Tag className="Card" href={href} target={target}>
      {icon && <i className={`Card-icon fa ${icon}`} style={{ color: `${iconColor}` }}></i>}
      {title && <p className='Card-title'>{title}</p>}
      <div className="Card-content">{children}</div>
    </Tag>
  )
}

const CardsGrid = ({ columns = 2, children }) => {
  columns = columns >= 2 ? columns : 2;
  return (
    <div className="CardsGrid" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {children}
    </div>
  );
};

export default CardsGrid;
