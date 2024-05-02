import { visit } from 'unist-util-visit';

import magicBlock from './magic-block';

const FlowContent = ['blockquote', 'code', 'heading', 'html', 'list', 'thematicBreak', 'paragraph', 'definition'];

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
    let hasMultipleBlocks = false;
    visit(node, childNode => {
      if (childNode.children?.filter(childChildNode => FlowContent.includes(childChildNode.type))?.length > 1)
        hasMultipleBlocks = true;
    });

    if (!find(node, n => n.type === 'break') && !hasMultipleBlocks) {
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
