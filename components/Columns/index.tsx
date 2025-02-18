import React from 'react';

import './style.scss';

export const Column = ({ children }: React.PropsWithChildren) => {
  return <div className="Column">{children}</div>;
};

interface Props extends React.PropsWithChildren<{ layout?: '1fr' | 'auto' | 'fixed' }> {}

const Columns = ({ children, layout = 'auto' }: Props) => {
  // eslint-disable-next-line no-param-reassign
  layout = layout === 'fixed' ? '1fr' : 'auto';
  const columnsCount = React.Children.count(children);

  return (
    <div className="Columns" style={{ gridTemplateColumns: `repeat(${columnsCount}, ${layout})` }}>
      {children}
    </div>
  );
};

export default Columns;
