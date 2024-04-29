import { visit } from 'unist-util-visit';

const codeTabs = () => tree => {
  visit(tree, (node, index, parent) => {
    if (node.type !== 'code' || parent.type === 'code-tabs') return;

    let children = [node];
    let walker = index + 1;
    while (walker <= parent.children.length) {
      const sibling = parent.children[walker];
      if (sibling?.type !== 'code') break;

      const olderSibling = parent.children[walker - 1];
      if (olderSibling.position.end.offset !== sibling.position.start.offset - 1) break;

      children.push(sibling);
      walker++;
    }

    // If there is a single code block, and it has either a title or a
    // language set, let's display it by wrapping it in a code tabs block.
    // Othewise, we can leave early!
    if (children.length === 1 && !(node.lang || node.meta)) return;

    parent.children.splice(index, children.length, {
      type: 'code-tabs',
      children,
      position: {
        start: children[0].position.start,
        end: children[children.length - 1].position.end,
      },
    });
  });

  console.log(JSON.stringify({ tree }, null, 2));

  return tree;
};

export default codeTabs;
