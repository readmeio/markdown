import React from 'react';

import './style.scss';

export const Card = ({ children, icon, iconColor, title }) => {
  return (
    <div className="Card">
      {icon && <i className={`Card-icon fa ${icon}`} style={{ color: `${iconColor}` }}></i>}
      {title && <h3 className='Card-title'>{title}</h3>}
      <div className="Card-content">{children}</div>
    </div>
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
