import React from 'react';

import './style.scss';

export const Column = ({ children }) => {
  return (
    <div className="Column">{children}</div>
  )
}

const Columns = ({ children, layout = 'auto'}) => {
  layout = layout === 'fixed' ? '1fr' : 'auto';
  const columnsCount = React.Children.count(children);

  return (
    <div className="Columns" style={{ gridTemplateColumns: `repeat(${columnsCount}, ${layout})` }}>
      {children}
    </div>
  );
};

export default Columns;
