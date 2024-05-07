import React from 'react';

interface Props extends JSX.IntrinsicAttributes {
  align?: ('left' | 'center' | 'right')[];
  children: [React.ReactElement<HTMLTableCaptionElement | HTMLTableSectionElement | HTMLTableRowElement>];
  rows?: any[][];
}

interface TableContentProps {
  align?: Props['align'];
  rows: Props['rows'];
}

const TableContent = ({ rows, align = [] }: TableContentProps) => {
  const [head, ...body] = rows;

  return (
    <>
      <thead>
        <tr>
          {head.map((cell, index) => (
            <th style={{ textAlign: align[index] || 'center' }}>{cell}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {body.map(row => (
          <tr>
            {row.map((cell, index) => (
              <td style={{ textAlign: align[index] || 'center' }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </>
  );
};

const Table = (props: Props) => {
  const { children, rows, align } = props;

  return (
    <div className="rdmd-table">
      <div className="rdmd-table-inner">
        <table>{rows ? <TableContent align={align} rows={rows} /> : children}</table>
      </div>
    </div>
  );
};

export default Table;
