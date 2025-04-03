import type { Parents } from 'mdast';
import type { Transform } from 'mdast-util-from-markdown';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';

import { visit } from 'unist-util-visit';

import * as Components from '../../components';
import { isMDXElement } from '../utils';

const handleMissingComponents =
  ({ components, missingComponents }): Transform =>
  tree => {
    visit(
      tree,
      isMDXElement,
      (node: MdxJsxFlowElement | MdxJsxTextElement, index: number, parent: Parents) => {
        if (node.name in components || node.name in Components) return;

        if (missingComponents === 'throw') {
          throw new Error(
            `Expected component \`${node.name}\` to be defined: you likely forgot to import, pass, or provide it.`,
          );
        }

        parent.children.splice(index, 1);
      },
      true,
    );
  };

export default handleMissingComponents;
