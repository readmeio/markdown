import type { Definition, LinkReference, Root, Text } from 'mdast';

import visit from 'unist-util-visit';

const linkReferenceTransformer =
  () =>
  (tree: Root): Root => {
    // @ts-expect-error
    visit(tree, 'linkReference', (node: LinkReference, index, parent) => {
      const definitions = {};

      // @ts-expect-error
      visit(tree, 'definition', (def: Definition) => {
        definitions[def.identifier] = def;
      });

      if (node.label === node.identifier && parent) {
        if (!(node.identifier in definitions)) {
          // @ts-expect-error
          parent.children[index] = {
            type: 'text',
            value: `[${node.label}]`,
            position: node.position,
          } as Text;
        }
      }
    });

    return tree;
  };

export default linkReferenceTransformer;
