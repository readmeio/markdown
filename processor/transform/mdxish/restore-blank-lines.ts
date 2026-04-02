import type { Root, RootContent } from 'mdast';
import type { Plugin } from 'unified';

/**
 * The markdown parser collapses multiple blank lines between adjacent
 * flow-level elements into a single paragraph break. This remark plugin
 * restores empty paragraph nodes by detecting position gaps larger than the
 * standard block separator (gap of 2 lines = single `\n\n`).
 */
const remarkRestoreBlankLines: Plugin<[], Root> = () => tree => {
  const newChildren: RootContent[] = [];

  for (let i = 0; i < tree.children.length; i += 1) {
    const curr = tree.children[i];
    newChildren.push(curr);

    const next = tree.children[i + 1];
    if (next?.position && curr.position) {
      const lineGap = next.position.start.line - curr.position.end.line;
      const emptyParagraphs = Math.floor((lineGap - 2) / 2);

      for (let j = 0; j < emptyParagraphs; j += 1) {
        newChildren.push({ type: 'paragraph', children: [] });
      }
    }
  }

  tree.children = newChildren;
};

export default remarkRestoreBlankLines;
