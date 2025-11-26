import type { Definition, LinkReference, Root, Text } from 'mdast';
import type { VFile } from 'vfile';

import { visit } from 'unist-util-visit';

const linkReferenceTransformer =
  () =>
  (tree: Root, vfile: VFile): Root => {
    const originalContent = vfile.toString();

    visit(tree, 'linkReference', (node: LinkReference, index, parent) => {
      const definitions = {};

      visit(tree, 'definition', (def: Definition) => {
        definitions[def.identifier] = def;
      });

      if (node.label === node.identifier && parent) {
        if (!(node.identifier in definitions)) {
          // Use offsets from the source file so we can slice out the exact string, including stray '[' characters.
          const startOffset = node.position?.start.offset;
          const endOffset = node.position?.end.offset;
          const sourceValue =
            typeof startOffset === 'number' && typeof endOffset === 'number'
              ? originalContent.slice(startOffset, endOffset)
              : null;
          // If offsets aren't available we regenerate a safe `[label]` string instead.
          const fallbackLabel = node.label || node.identifier || '';
          // Preserve the sliced substring when it contains the dangling '[', otherwise synthesize `[label]`.
          const value = sourceValue?.endsWith('[') ? sourceValue : `[${fallbackLabel}]`;

          parent.children[index] = {
            type: 'text',
            value,
            position: node.position,
          } as Text;
        }
      }
    });

    return tree;
  };

export default linkReferenceTransformer;
