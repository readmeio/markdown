import React from 'react';

import './style.scss';

export const Column = ({ children }) => {
  return (
    <div className="Column">{children}</div>
  )
}

const Columns = ({ children, columns = 2, layout = 'auto'}) => {
  layout = layout === 'fixed' ? '1fr' : 'auto';
  return (
    <div className="Columns" style={{ gridTemplateColumns: `repeat(${columns}, ${layout})` }}>
      {children}
    </div>
  );
};

export default Columns;
