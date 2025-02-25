import type { CustomComponents, HastHeading, IndexableElements, RMDXModule, TocList, TocListItem } from '../../types';
import type { Root } from 'hast';
import type { MdxjsEsm } from 'mdast-util-mdxjs-esm';
import type { Transformer } from 'unified';

import { valueToEstree } from 'estree-util-value-to-estree';
import { h } from 'hastscript';
import { visit } from 'unist-util-visit';

import { mdx, plain } from '../../lib';
import { hasNamedExport } from '../utils';

interface Options {
  components?: CustomComponents;
}

export const rehypeToc = ({ components = {} }: Options): Transformer<Root, Root> => {
  return (tree: Root): void => {
    if (hasNamedExport(tree, 'toc')) return;

    const headings = tree.children.filter(
      child =>
        (child.type === 'element' && ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(child.tagName)) ||
        (child.type === 'mdxJsxFlowElement' && child.name in components),
    ) as IndexableElements[];

    tree.children.unshift({
      type: 'mdxjsEsm',
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
                    id: { type: 'Identifier', name: 'toc' },
                    init: valueToEstree(headings),
                  },
                ],
              },
            },
          ],
        },
      },
    } as MdxjsEsm);
  };
};

const MAX_DEPTH = 2;
const getDepth = (el: HastHeading) => parseInt(el.tagName?.match(/^h(\d)/)[1], 10);

const tocToHast = (headings: HastHeading[] = []): TocList => {
  const min = Math.min(...headings.map(getDepth));
  const ast = h('ul') as TocList;
  const stack: TocList[] = [ast];

  headings.forEach(heading => {
    const depth = getDepth(heading) - min + 1;
    if (depth > MAX_DEPTH) return;

    while (stack.length < depth) {
      const ul = h('ul') as TocList;

      stack[stack.length - 1].children.push(h('li', null, ul) as TocListItem);
      stack.push(ul);
    }

    while (stack.length > depth) {
      stack.pop();
    }

    if (heading.properties) {
      const content = plain({ type: 'root', children: heading.children }) as string;

      stack[stack.length - 1].children.push(
        h('li', null, h('a', { href: `#${heading.properties.id}` }, content)) as TocListItem,
      );
    }
  });

  return ast;
};

export const tocHastToMdx = (toc: IndexableElements[], components: Record<string, RMDXModule['toc']>) => {
  const tree: Root = { type: 'root', children: toc };

  visit(tree, 'mdxJsxFlowElement', (node, index, parent) => {
    const subToc = components[node.name] || [];
    parent.children.splice(index, 1, ...subToc);
  });

  const tocHast = tocToHast(tree.children as HastHeading[]);
  // @ts-expect-error: tocHast is extending Element, but to please mdx we need
  // to cast it to Root. But I think there's something wrong with our
  // RootContentMap type.
  return mdx(tocHast, { hast: true });
};
