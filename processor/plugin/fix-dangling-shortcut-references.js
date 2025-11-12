const { visit } = require('unist-util-visit');

const PROTECTED_PARENTS = new Set(['code', 'inlineCode', 'html', 'jsx']);

const nodeToString = node => {
  if (!node) return '';
  if (typeof node.value === 'string') return node.value;
  if (!node.children || !node.children.length) return '';
  return node.children.map(child => nodeToString(child)).join('');
};

const getSpan = node => {
  const start = node?.position?.start?.offset;
  const end = node?.position?.end?.offset;
  if (typeof start !== 'number' || typeof end !== 'number') return null;
  return end - start;
};

module.exports = function fixDanglingShortcutReferences() {
  return tree => {
    visit(tree, (node, index, parent) => {
      if (!parent || !Array.isArray(parent.children)) return;
      if (PROTECTED_PARENTS.has(parent.type)) return;
      if (node.type !== 'linkReference' || node.referenceType !== 'shortcut') return;

      const next = parent.children[index + 1];
      if (!next || next.type !== 'text') return;

      const label = nodeToString(node);
      const span = getSpan(node);
      if (span === null) return;

      const expectedSpan = label.length + 2; // "[", "]"
      const extraChars = span - expectedSpan;
      if (extraChars <= 0) return;

      const replacement = {
        type: 'text',
        value: `[${label}]${'['.repeat(extraChars)}${next.value}`,
        data: { danglingShortcutLiteral: true },
        position: {
          start: node.position.start,
          end: next.position?.end || node.position.end,
        },
      };

      parent.children.splice(index, 2, replacement);
    });
  };
};
