import { BlockContent, Code } from 'mdast';
import { CodeTabs } from 'types';
import { visit } from 'unist-util-visit';
import { NodeTypes } from '../../enums';

const codeTabs = () => tree => {
  visit(tree, 'code', (node: Code) => {
    const { lang, meta, value } = node;

    node.data = {
      hName: 'Code',
      hProperties: { lang, meta, value },
    };
  });

  visit(tree, 'code', (node: Code, index: number, parent: BlockContent) => {
    if (parent.type === 'code-tabs' || !('children' in parent)) return;

    const length = parent.children.length;
    let children = [node];
    let walker = index + 1;

    while (walker <= length) {
      const sibling = parent.children[walker];
      if (sibling?.type !== 'code') break;

      const olderSibling = parent.children[walker - 1];
      if (olderSibling.position.end.offset + sibling.position.start.column !== sibling.position.start.offset) break;

      children.push(sibling);
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

export default codeTabs;
