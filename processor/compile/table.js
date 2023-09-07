import magicBlock from './magic-block';

const find = (node, fn) => {
  if (fn(node)) return node;
  if (node.children) return node.children.find(n => find(n, fn));

  return null;
};

export default function TableCompiler() {
  const { Compiler } = this;
  const { visitors } = Compiler.prototype;

  const { table: original } = visitors;

  visitors.table = function (node, parent) {
    if (!find(node, n => n.type === 'break')) {
      return original.call(this, node);
    }

    const data = {
      data: {},
      cols: node.children[0]?.children?.length || 0,
      rows: node.children.length - 1,
      align: [...node.align],
    };

    node.children.forEach((row, i) => {
      row.children.forEach((cell, j) => {
        const col = i === 0 ? 'h' : i - 1;
        const string = this.all(cell).join('').replace(/\\\n/g, '  \n');

        data.data[`${col}-${j}`] = string;
      });
    });

    return magicBlock('parameters', data, parent);
  };
}
