import React from 'react';

interface Props extends JSX.IntrinsicAttributes {
  children: [React.ReactElement<HTMLTableCaptionElement | HTMLTableSectionElement | HTMLTableRowElement>];
}

const Table = (props: Props) => {
  const { children } = props;
  return (
    <div className="rdmd-table">
      <div className="rdmd-table-inner">
        <table>{children}</table>
      </div>
    </div>
  );
};

export default Table;
