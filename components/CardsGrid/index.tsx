import React from 'react';

import './style.scss';

const Card = ({ children }) => <div className="Card">{children}</div>;

const CardsGrid = ({ columns = 2, children }) => {
  columns = columns >= 2 ? columns : 2;
  return (
    <div className="CardsGrid" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {React.Children.map(children, e => (
        <Card>{e}</Card>
      ))}
    </div>
  );
};

export default CardsGrid;
