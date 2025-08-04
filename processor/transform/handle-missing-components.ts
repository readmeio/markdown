import type { CompileOpts } from '../../lib/compile';
import type { Parents } from 'mdast';
import type { Transform } from 'mdast-util-from-markdown';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';

import { visit } from 'unist-util-visit';

import * as Components from '../../components';
import mdast from '../../lib/mdast';
import { getExports, isMDXElement } from '../utils';

type HandleMissingComponentsProps = Pick<CompileOpts, 'components' | 'missingComponents'>;

const handleMissingComponents =
  ({ components, missingComponents }: HandleMissingComponentsProps): Transform =>
  tree => {
    const allComponents = new Set([
      ...getExports(tree),
      ...Object.keys(Components),
      ...Object.keys(components),
      ...Object.values(components).flatMap(doc => getExports(mdast(doc))),
      'Recipe',
      'Variable',
      'TutorialTile',
    ]);

    visit(
      tree,
      isMDXElement,
      (node: MdxJsxFlowElement | MdxJsxTextElement, index: number, parent: Parents) => {
        if (allComponents.has(node.name) || node.name.match(/^[a-z]/)) return;

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
