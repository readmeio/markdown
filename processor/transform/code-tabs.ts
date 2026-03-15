import type { BlockContent, Code, Node } from 'mdast';
import type { CodeTabs } from 'types';

import { visit } from 'unist-util-visit';

import { NodeTypes } from '../../enums';

const isCode = (node: Node): node is Code => node?.type === 'code';

const codeTabsTransformer =
  ({ copyButtons }: { copyButtons?: boolean } = {}) =>
  (tree: Node) => {
    visit(tree, 'code', (node: Code) => {
      const { lang, meta, value } = node;
      node.data = {
        hProperties: { lang, meta, value, copyButtons },
      };
    });

    visit(tree, 'code', (node: Code, index: number, parent: BlockContent) => {
      if (parent.type === 'code-tabs' || !('children' in parent)) return;

      const length = parent.children.length;
      const children = [node];
      let walker = index + 1;

      while (walker <= length) {
        const sibling = parent.children[walker];
        if (!isCode(sibling)) break;

        // Check that the two code blocks are truly adjacent (no blank lines or
        // other content between them). The `gap` is the number of raw characters
        // between the end of the previous block and the start of this one.
        // For a LF-separated pair the gap equals `start.column` (the newline
        // char(s) plus any indentation). CRLF line endings add one extra byte
        // (\r) without advancing the line count, so we also accept
        // `start.column + 1` provided the blocks are still on consecutive lines.
        const olderSibling = parent.children[walker - 1];
        const gap = sibling.position.start.offset - olderSibling.position.end.offset;
        const lineDiff = sibling.position.start.line - olderSibling.position.end.line;
        const isCRLF = gap === sibling.position.start.column + 1 && lineDiff === 1;
        if (gap !== sibling.position.start.column && !isCRLF) break;

        children.push(sibling);
        // eslint-disable-next-line no-plusplus
        walker++;
      }

      // If there is a single code block, and it has either a title or a
      // language set, let's display it by wrapping it in a code tabs block.
      // Othewise, we can leave early!
      if (children.length === 1 && !(node.lang || node.meta)) return;

      const codeTabs: CodeTabs = {
        type: NodeTypes.codeTabs,
        children,
        data: {
          hName: 'CodeTabs',
        },
        position: {
          start: children[0].position.start,
          end: children[children.length - 1].position.end,
        },
      };

      parent.children.splice(index, children.length, codeTabs);
    });

    return tree;
  };

export default codeTabsTransformer;
