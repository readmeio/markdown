import type { Html, Parent, Text } from 'mdast';
import type { Plugin } from 'unified';

import { visit } from 'unist-util-visit';

const LOWERCASE_TAG_FRAGMENT_RE = /^<\/?[a-z][a-z0-9-]*/;

function hasTrailingIncompleteLowercaseTag(value: string) {
  const lastTagStart = value.lastIndexOf('<');
  const lastTagEnd = value.lastIndexOf('>');

  if (lastTagStart === -1 || lastTagStart < lastTagEnd) {
    return false;
  }

  return LOWERCASE_TAG_FRAGMENT_RE.test(value.slice(lastTagStart));
}

/**
 * Downgrade malformed raw HTML nodes to text before remark-rehype emits HAST `raw`
 * nodes for rehype-raw to reparse.
 *
 * rehype-raw tolerates an incomplete lowercase tag at EOF, but it can throw when
 * a later raw HTML node causes parsing to continue from that malformed state.
 */
const sanitizeMalformedRawHtml: Plugin<[], Parent> = () => tree => {
  visit(tree, 'html', (node: Html, index, parent: Parent | undefined) => {
    if (!parent || index === undefined || !node.value) return;
    if (!hasTrailingIncompleteLowercaseTag(node.value)) return;

    const replacement: Text = {
      type: 'text',
      value: node.value,
      position: node.position,
    };

    parent.children[index] = replacement;
  });
};

export default sanitizeMalformedRawHtml;
