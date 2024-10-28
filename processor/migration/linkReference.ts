import type { Definition, LinkReference, Root, Text } from 'mdast';

import { visit } from 'unist-util-visit';

const linkReferenceTransformer =
  () =>
  (tree: Root): Root => {
    visit(tree, 'linkReference', (node: LinkReference, index, parent) => {
      const definitions = {};

      visit(tree, 'definition', (def: Definition) => {
        definitions[def.identifier] = def;
      });

      if (node.label === node.identifier && parent) {
        if (!(node.identifier in definitions)) {
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
