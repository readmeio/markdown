import React from 'react';
interface Props extends JSX.IntrinsicAttributes {
    align: ('center' | 'left' | 'right')[];
    children: [React.ReactElement<HTMLTableCaptionElement | HTMLTableRowElement | HTMLTableSectionElement>];
}
declare const Table: (props: Props) => React.JSX.Element;
export default Table;
