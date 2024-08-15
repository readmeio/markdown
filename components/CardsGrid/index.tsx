import React from 'react';

import './style.scss';

export const Card = ({ children, href, icon, title }) => {
  return (
    <div className="Card">
      <i className={`fa ${icon}`}></i>
      <h3>{title}</h3>
      {children}
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
