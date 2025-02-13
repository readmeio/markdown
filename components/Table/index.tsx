import React from 'react';

interface Props extends JSX.IntrinsicAttributes {
  align: ('center' | 'left' | 'right')[];
  children: [React.ReactElement<HTMLTableCaptionElement | HTMLTableRowElement | HTMLTableSectionElement>];
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
