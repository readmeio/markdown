const { visit } = require('unist-util-visit');

const PROTECTED_PARENTS = new Set(['code', 'inlineCode', 'html', 'jsx']);

// Resolve the readable label Remark inferred for the link reference.
const labelFrom = node =>
  node?.label ??
  node?.identifier ??
  (typeof node?.value === 'string' ? node.value : (node?.children || []).map(labelFrom).join(''));

// Remark drops extra "[" characters when a shortcut link is immediately followed by another "["
// (e.g. "[foo][bar"). This plugin visits the AST, looks for link references, and compares the
// span denoted by the node with the original section to identify dropped [ characters.
module.exports = function fixDanglingShortcutReferences() {
  return tree => {
    visit(tree, 'linkReference', (node, index, parent) => {
      // Skip contexts where we should never mutate literals (code, inline code, raw HTML/JSX).
      if (!parent?.children || PROTECTED_PARENTS.has(parent.type) || node.referenceType !== 'shortcut') return;

      const next = parent.children[index + 1];
      if (!next || next.type !== 'text') return; // Need the stray "[" token that Remark left as text.

      const start = node.position?.start?.offset;
      const end = node.position?.end?.offset;
      if (typeof start !== 'number' || typeof end !== 'number') return;

      const label = labelFrom(node);
      const extraChars = end - start - (label.length + 2); // surrounding brackets
      if (extraChars <= 0) return;

      // Collapse the broken linkReference + following text into a plain text node that mirrors
      // the original markdown literal, tagging it so the compiler can output it verbatim.
      parent.children.splice(index, 2, {
        type: 'text',
        value: `[${label}]${'['.repeat(extraChars)}${next.value}`,
        data: { danglingShortcutLiteral: true },
        position: {
          start: node.position.start,
          end: next.position?.end || node.position.end,
        },
      });
    });
  };
};
