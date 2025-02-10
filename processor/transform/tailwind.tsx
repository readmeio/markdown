import type { PhrasingContent, BlockContent, Root } from 'mdast';
import type { MdxjsEsm, MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';
import type { Plugin } from 'unified';

import { valueToEstree } from 'estree-util-value-to-estree';
import { visit, SKIP } from 'unist-util-visit';

import tailwindBundle from '../../utils/tailwind-bundle';
import { hasNamedExport, isMDXElement, toAttributes } from '../utils';

interface TailwindRootOptions {
  components: Record<string, string>;
}

type Visitor =
  | ((node: MdxJsxFlowElement, index: number, parent: BlockContent) => undefined | void)
  | ((node: MdxJsxTextElement, index: number, parent: PhrasingContent) => undefined | void);

const exportTailwindStylesheet = async (tree: Root, components: TailwindRootOptions['components']): Promise<void> => {
  if (hasNamedExport(tree, 'stylesheet')) return;

  const stylesheet = (await tailwindBundle(Object.values(components).join('\n\n'), { prefix: '.readme-tailwind' })).css;

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
                  id: { type: 'Identifier', name: 'stylesheet' },
                  init: valueToEstree(stylesheet),
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

    // eslint-disable-next-line consistent-return
    return SKIP;
  };

const tailwind: Plugin<[TailwindRootOptions]> =
  ({ components }) =>
  async (tree: Root) => {
    visit(tree, isMDXElement, injectTailwindRoot({ components }));

    await exportTailwindStylesheet(tree, components);

    return tree;
  };

export default tailwind;
