import { Table } from 'mdast';

//visitors.table = function (node) {
//if (!find(node, n => n.type === 'break')) {
//return original.call(this, node);
//}

//const data = {
//data: {},
//cols: node.children[0]?.children?.length || 0,
//rows: node.children.length - 1,
//align: [...node.align],
//};
//};
//};

const table = original => (table: Table, _, state, info) => {
  return original(table, _, state, info);
};

export default table;
