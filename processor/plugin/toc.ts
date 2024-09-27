import { Transformer } from 'unified';
import { Root } from 'hast';
import { valueToEstree } from 'estree-util-value-to-estree';
import { h } from 'hastscript';

import { CustomComponents, HastHeading, IndexableElements, TocList, TocListItem } from '../../types';
import { visit } from 'unist-util-visit';
import { mdx, plain } from '../../lib';

interface Options {
  components?: Record<string, any>;
}

export const rehypeToc = ({ components = {} }: Options): Transformer<Root, Root> => {
  return (tree: Root): void => {
    const headings = tree.children.filter(
      child =>
        (child.type === 'element' && ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(child.tagName)) ||
        (child.type === 'mdxJsxFlowElement' && child.name in components),
    ) as IndexableElements[];

    // @todo: Very confused by this error
    // @ts-expect-error
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
    });
  };
};

const MAX_DEPTH = 2;
const getDepth = (el: HastHeading) => parseInt(el.tagName?.match(/^h(\d)/)[1]);

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
      const content = plain({ type: 'root', children: heading.children });

      stack[stack.length - 1].children.push(
        h('li', null, h('a', { href: `#${heading.properties.id}` }, content)) as TocListItem,
      );
    }
  });

  return ast;
};

export const tocToMdx = (toc: IndexableElements[], components: CustomComponents) => {
  const tree: Root = { type: 'root', children: toc };

  visit(tree, 'mdxJsxFlowElement', (node, index, parent) => {
    const toc = components[node.name].toc || [];
    parent.children.splice(index, 1, ...toc);
  });

  const tocHast = tocToHast(tree.children as HastHeading[]);
  return mdx(tocHast, { hast: true });
};
