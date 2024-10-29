import type { Emphasis, Parent, Root, Strong, Text } from 'mdast';

import { visit, EXIT } from 'unist-util-visit';

const strongTest = (node: any): node is Emphasis | Strong => ['emphasis', 'strong'].includes(node.type);

const addSpaceBefore = (index: number, parent: Parent) => {
  if (!(index > 0 && parent.children[index - 1])) return;

  const prev = parent.children[index - 1];
  // @ts-ignore - I think this is also a dependency versioning issue
  if (!('value' in prev) || prev.value.endsWith(' ') || prev.type === 'escape') return;

  parent.children.splice(index, 0, { type: 'text', value: ' ' });
};

const addSpaceAfter = (index: number, parent: Parent) => {
  if (!(index < parent.children.length - 1 && parent.children[index + 1])) return;

  const nextChild = parent.children[index + 1];
  if (!('value' in nextChild) || nextChild.value.startsWith(' ')) return;

  parent.children.splice(index + 1, 0, { type: 'text', value: ' ' });
};

const trimEmphasis = (node: Emphasis | Strong, index: number, parent: Parent) => {
  let trimmed = false;

  visit(node, 'text', (child: Text) => {
    const newValue = child.value.trimStart();

    if (newValue !== child.value) {
      trimmed = true;
      child.value = newValue;
    }

    return EXIT;
  });

  visit(
    node,
    'text',
    (child: Text) => {
      const newValue = child.value.trimEnd();

      if (newValue !== child.value) {
        trimmed = true;
        child.value = newValue;
      }

      return EXIT;
    },
    true,
  );

  if (trimmed) {
    addSpaceBefore(index, parent);
    addSpaceAfter(index, parent);
  }
};

const emphasisTransfomer = () => (tree: Root) => {
  visit(tree, strongTest, trimEmphasis);

  return tree;
};

export default emphasisTransfomer;
