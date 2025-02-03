import { PhrasingContent, BlockContent, Node, Root } from 'mdast';
import { Plugin } from 'unified';

import { MdxjsEsm, MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';
import { visit } from 'unist-util-visit';
import { valueToEstree } from 'estree-util-value-to-estree';

import { isMDXElement, toAttributes } from '../utils';
import tailwindBundle from '../../utils/tailwind-bundle';

interface TailwindRootOptions {
  components: Record<string, string>;
}

type Visitor =
  | ((node: MdxJsxFlowElement, index: number, parent: BlockContent) => undefined | void)
  | ((node: MdxJsxTextElement, index: number, parent: PhrasingContent) => undefined | void);

const exportTailwindStylesheets = async (tree: Node, components: TailwindRootOptions['components']): Promise<void> => {
  const stylesheet = (await tailwindBundle(Object.values(components).join('\n\n'), { prefix: `.readme-tailwind` })).css;

  const exportNode: MdxjsEsm = {
    type: 'mdxjsEsm',
    value: '',
    data: {
      estree: {
        type: 'Program',
        sourceType: 'module',
        body: [
          {
            type: 'ExportNamedDeclaration',
            source: null,
            specifiers: [],
            declaration: {
              type: 'VariableDeclaration',
              kind: 'const',
              declarations: [
                {
                  type: 'VariableDeclarator',
                  id: { type: 'Identifier', name: 'stylesheets' },
                  init: valueToEstree([stylesheet]),
                },
              ],
            },
          },
        ],
      },
    },
  };

  (tree as Root).children.unshift(exportNode);
};

const injectTailwindRoot =
  ({ components = {} }): Visitor =>
  (node, index, parent) => {
    if (!('name' in node)) return;
    if (!(node.name in components)) return;
    if (!('children' in parent)) return;

    const attrs = {
      flow: node.type === 'mdxJsxFlowElement',
    };

    const wrapper = {
      type: node.type,
      name: 'TailwindRoot',
      attributes: toAttributes(attrs),
      children: [node],
    };

    parent.children.splice(index, 1, wrapper);
  };

const tailwind: Plugin<[TailwindRootOptions]> =
  ({ components }) =>
  async tree => {
    visit(tree, isMDXElement, injectTailwindRoot({ components }));

    await exportTailwindStylesheets(tree, components);

    return tree;
  };

export default tailwind;
