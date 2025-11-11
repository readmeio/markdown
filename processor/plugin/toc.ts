import type { CustomComponents, HastHeading, IndexableElements, RMDXModule, TocList, TocListItem } from '../../types';
import type { Root } from 'hast';
import type { MdxjsEsm } from 'mdast-util-mdxjs-esm';
import type { Transformer } from 'unified';

import { valueToEstree } from 'estree-util-value-to-estree';
import { h } from 'hastscript';
import { visit, SKIP } from 'unist-util-visit';

import { mdx, plain } from '../../lib';
import { hasNamedExport } from '../utils';

interface Options {
  components?: CustomComponents;
}

interface CalloutCandidateNode {
  data?: unknown;
  name?: unknown;
  properties?: unknown;
  tagName?: unknown;
  type?: unknown;
}

const isCalloutNode = (node: unknown): boolean => {
  if (!node || typeof node !== 'object') return false;
  const { type, name, tagName, data, properties } = node as CalloutCandidateNode;

  if (type === 'mdxJsxFlowElement' && name === 'Callout') {
    return true;
  }

  if (type !== 'element') return false;

  if (tagName === 'Callout') return true;

  if (typeof data === 'object' && data && 'hName' in (data as Record<string, unknown>)) {
    const { hName } = data as { hName?: unknown };
    if (hName === 'Callout') return true;
  }

  if (tagName !== 'blockquote') return false;

  if (!properties || typeof properties !== 'object') return false;

  const { className } = properties as { className?: unknown };
  if (!className) return false;

  if (Array.isArray(className)) {
    return className.some(cls => typeof cls === 'string' && cls.startsWith('callout'));
  }

  if (typeof className === 'string') {
    return className.includes('callout');
  }

  return false;
};

export const rehypeToc = ({ components = {} }: Options): Transformer<Root, Root> => {
  return (tree: Root): void => {
    if (hasNamedExport(tree, 'toc')) return;

    const headings: IndexableElements[] = [];

    visit(tree, (node, _index, parent) => {
      if (isCalloutNode(node)) {
        return SKIP;
      }

      const insideCallout = parent ? isCalloutNode(parent) : false;
      if (insideCallout) {
        return undefined;
      }

      if (node.type === 'element' && ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(node.tagName)) {
        headings.push(node as HastHeading);
      }

      if (node.type === 'mdxJsxFlowElement' && node.name && node.name in components) {
        headings.push(node as IndexableElements);
      }

      return undefined;
    });

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
