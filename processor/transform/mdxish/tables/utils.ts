import type { Literal, Node, Parent } from 'mdast';

export const tableTags = new Set([
  'thead',
  'tbody',
  'tfoot',
  'caption',
  'colgroup',
  'col',
  'tr',
  'th',
  'td',
]);

/**
 * If the cell has exactly one paragraph child, unwrap it so its inline children sit
 * directly under the cell (matches GFM table cell shape and avoids stray `<p>` wrappers).
 *
 * When there are multiple paragraphs, leave them intact — they represent distinct lines
 * of content that need to be preserved for JSX `<Table>` serialization.
 */
// HTML void elements never have a closing tag, so they shouldn't go on the
// balance stack.
const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
]);

// Single HTML tag with optional attributes and optional self-close. Whole-string
// match so multi-tag values (`<a><b>`) and comments are ignored.
const TAG_REGEX = /^<\s*(\/)?\s*([a-zA-Z][\w-]*)\b[^>]*?(\/)?\s*>$/;

/**
 * Repairs unbalanced HTML inside a JSX table cell so it can be safely emitted
 * as JSX `<th>`/`<td>` children. Remark splits each raw tag into its own
 * `html` node, so balancing is a stack walk:
 *
 * - Open tags push onto a stack.
 * - Close tags pop the matching tag, also popping any unclosed tags nested
 *   above it (browser-like recovery for `<b><i>x</b>`).
 * - Orphan close tags (no matching open) have their value emptied so they
 *   don't render as raw text.
 * - Self-closing tags and void elements (br, hr, img, …) are ignored.
 *
 * Any tags left on the stack after the walk get synthetic closers appended
 * to the cell, in reverse order.
 */
export const balanceHtmlInCell = (children: Node[]): Node[] => {
  const stack: string[] = [];

  const walk = (nodes: Node[]) => {
    for (let i = 0; i < nodes.length; i += 1) {
      const node = nodes[i];
      if (node.type === 'html' && 'value' in node) {
        const match = TAG_REGEX.exec((node as Literal).value);
        // eslint-disable-next-line no-continue
        if (!match) continue;
        const [, slash, name, selfClose] = match;
        const tag = name.toLowerCase();
        // eslint-disable-next-line no-continue
        if (VOID_ELEMENTS.has(tag) || selfClose) continue;
        if (!slash) {
          stack.push(tag);
        } else {
          const idx = stack.lastIndexOf(tag);
          if (idx === -1) {
            (node as Literal).value = '';
          } else {
            // Insert synthetic closers for any nested-but-unclosed tags above
            // `idx` so the output is well-formed (e.g. `<b><i>x</b>` →
            // `<b><i>x</i></b>`).
            const danglers = stack.slice(idx + 1).reverse();
            if (danglers.length > 0) {
              const closers: Node[] = danglers.map(t => ({ type: 'html', value: `</${t}>` }) as Node);
              nodes.splice(i, 0, ...closers);
              i += closers.length;
            }
            stack.length = idx;
          }
        }
      } else if ('children' in node && Array.isArray((node as Parent).children)) {
        walk((node as Parent).children as Node[]);
      }
    }
  };

  const out = [...children];
  walk(out);

  if (stack.length === 0) return out;

  const closers: Node[] = stack
    .slice()
    .reverse()
    .map(tag => ({ type: 'html', value: `</${tag}>` }) as Node);
  return [...out, ...closers];
};

export const unwrapSoleParagraph = (children: Node[]): Node[] => {
  const paragraphCount = children.filter(c => c.type === 'paragraph').length;
  if (paragraphCount !== 1) return children;

  return children.flatMap(child => {
    if (child.type === 'paragraph' && 'children' in child && Array.isArray(child.children)) {
      return child.children as Node[];
    }
    return [child];
  });
};
