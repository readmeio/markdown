import type { CustomComponents, HastHeading, IndexableElements, RMDXModule, TocList, TocListItem } from '../../types';
import type { Element, Root } from 'hast';
import type { MdxjsEsm } from 'mdast-util-mdxjs-esm';
import type { Transformer } from 'unified';

import { valueToEstree } from 'estree-util-value-to-estree';
import { h } from 'hastscript';

import { mdx, plain } from '../../lib';
import { STANDARD_HTML_TAGS } from '../../utils/html-tags';
import { hasNamedExport } from '../utils';

const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
const DEFAULT_MAX_DEPTH = 2;
const isHeadingTag = (tag?: string) => (tag ? HEADING_TAGS.includes(tag) : false);

const isStandardHtmlElement = (node: Element): boolean => STANDARD_HTML_TAGS.has(node.tagName.toLowerCase());

interface Options {
  components?: CustomComponents;
}

/** Extract the depth (1-6) from a heading element */
export const getDepth = (el: HastHeading): number => parseInt(el.tagName?.match(/^h(\d)/)?.[1] || '1', 10);

/** Extract all heading elements (h1-h6) from a HAST tree, excluding those inside custom components */
export function extractToc(tree: Root, components: CustomComponents = {}): HastHeading[] {
  const headings: HastHeading[] = [];
  const componentsByTag = new Map<string, RMDXModule>(
    Object.entries(components).map(([tag, mod]) => [tag.toLowerCase(), mod]),
  );

  // Recursively walk component TOCs so headings declared inside nested custom components are found.
  const collectComponentHeadings = (tag: string, seen: Set<string>): HastHeading[] => {
    const component = componentsByTag.get(tag);
    if (!component?.toc || seen.has(tag)) return [];

    seen.add(tag);
    const collected = (component.toc as IndexableElements[]).flatMap(entry => {
      if (entry.type === 'element' && isHeadingTag(entry.tagName)) {
        return [entry as HastHeading];
      }
      if (entry.type === 'mdxJsxFlowElement' && typeof entry.name === 'string') {
        return collectComponentHeadings(entry.name.toLowerCase(), seen);
      }
      return [];
    });
    seen.delete(tag);

    return collected;
  };

  // Depth-first traversal over the HAST tree, collecting headings while skipping custom component bodies.
  const traverse = (node: Root | Root['children'][number]): void => {
    if (node.type === 'element') {
      const tag = node.tagName.toLowerCase();

      if (isHeadingTag(node.tagName)) {
        headings.push(node as HastHeading);
      }

      if (componentsByTag.has(tag)) {
        headings.push(...collectComponentHeadings(tag, new Set()));
      }

      // Only traverse into standard HTML elements, skip custom components (like Callout)
      if (isStandardHtmlElement(node) && node.children) {
        node.children.forEach(traverse);
      }
    } else if ('children' in node && Array.isArray(node.children)) {
      node.children.forEach(traverse);
    }
  };

  traverse(tree);
  return headings;
}

/** A rehype plugin to generate a flat list of top-level headings or jsx flow elements. */
export const rehypeToc = ({ components = {} }: Options): Transformer<Root, Root> => {
  return (tree: Root): void => {
    if (hasNamedExport(tree, 'toc')) return;

    const headings = tree.children.filter(
      child =>
        (child.type === 'element' && HEADING_TAGS.includes(child.tagName)) ||
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

/** Convert headings list to a nested HAST list for table of contents rendering. */
export const tocToHast = (headings: HastHeading[] = [], maxDepth = DEFAULT_MAX_DEPTH): TocList => {
  if (headings.length === 0) return h('ul') as TocList;

  const min = Math.min(...headings.map(getDepth));
  const ast = h('ul') as TocList;
  const stack: TocList[] = [ast];

  headings.forEach(heading => {
    const depth = getDepth(heading) - min + 1;
    if (depth > maxDepth) return;

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

/*
 * `tocHastToMdx` is a utility for combining `TocList`s of a root document and
 * any child components it may have. Once combined it will generate a markdown
 * doc representing a table of contents.
 */
export const tocHastToMdx = (toc: IndexableElements[] | undefined, components: Record<string, RMDXModule['toc']>) => {
  if (typeof toc === 'undefined') return '';

  const injected = toc.flatMap(node => {
    return node.type === 'mdxJsxFlowElement' && node.name in components ? components[node.name] || [] : node;
  });

  const tocHast = tocToHast(injected as HastHeading[]);
  return mdx({ type: 'root', children: [tocHast] }, { hast: true });
};
