import type { PhrasingContent, BlockContent, Root } from 'mdast';
import type { MdxjsEsm, MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';
import type { Plugin } from 'unified';
import type { VFile } from 'vfile';

import { valueToEstree } from 'estree-util-value-to-estree';
import { visit, SKIP } from 'unist-util-visit';

import { tailwindPrefix } from '../../utils/consts';
import tailwindBundle from '../../utils/tailwind-bundle';
import { hasNamedExport, isMDXElement, toAttributes, getExports } from '../utils';

interface TailwindRootOptions {
  components: Record<string, string>;
  parseRoot?: boolean;
}

type Visitor =
  | ((node: MdxJsxFlowElement, index: number, parent: BlockContent) => undefined | void)
  | ((node: MdxJsxTextElement, index: number, parent: PhrasingContent) => undefined | void);

const exportTailwindStylesheet = async (
  tree: Root,
  vfile: VFile,
  { components, parseRoot }: TailwindRootOptions,
): Promise<void> => {
  if (hasNamedExport(tree, 'stylesheet')) return;

  const stringToParse = [...Object.values(components), parseRoot ? String(vfile) : ''].join('\n\n');
  const stylesheet = (await tailwindBundle(stringToParse, { prefix: `.${tailwindPrefix}` })).css;

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
  ({ components, parseRoot }) =>
  async (tree: Root, vfile: VFile) => {
    const localComponents = getExports(tree).reduce((acc, name) => {
      acc[name] = String(vfile);
      return acc;
    }, {});

    visit(tree, isMDXElement, injectTailwindRoot({ components: { ...components, ...localComponents } }));

    await exportTailwindStylesheet(tree, vfile, { components: { ...components, ...localComponents }, parseRoot });

    return tree;
  };

export default tailwind;
