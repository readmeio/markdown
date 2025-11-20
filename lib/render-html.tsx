import type { GlossaryTerm } from '../contexts/GlossaryTerms';
import type { CustomComponents, HastHeading, IndexableElements, RMDXModule, TocList } from '../types';
import type { Variables } from '../utils/user';
import type { Root } from 'hast';

import { fromHtml } from 'hast-util-from-html';
import { h } from 'hastscript';
import React from 'react';
import rehypeReact from 'rehype-react';
import { unified } from 'unified';

import * as Components from '../components';
import Contexts from '../contexts';

import plain from './plain';
import makeUseMDXComponents from './utils/makeUseMdxComponents';

export interface RenderHtmlOpts {
  baseUrl?: string;
  components?: CustomComponents;
  copyButtons?: boolean;
  terms?: GlossaryTerm[];
  theme?: 'dark' | 'light';
  variables?: Variables;
}

const MAX_DEPTH = 2;
const getDepth = (el: HastHeading) => parseInt(el.tagName?.match(/^h(\d)/)?.[1] || '1', 10);

/**
 * Extract headings (h1-h6) from HAST for table of contents
 */
function extractToc(tree: Root): HastHeading[] {
  const headings: HastHeading[] = [];

  const visit = (node: Root | Root['children'][number]): void => {
    if (node.type === 'element' && ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(node.tagName)) {
      headings.push(node as HastHeading);
    }

    if ('children' in node && Array.isArray(node.children)) {
      node.children.forEach(child => visit(child));
    }
  };

  visit(tree);
  return headings;
}

/**
 * Convert headings to TOC HAST structure (similar to tocToHast in toc.ts)
 */
function tocToHast(headings: HastHeading[] = []): TocList {
  if (headings.length === 0) {
    return h('ul') as TocList;
  }

  const min = Math.min(...headings.map(getDepth));
  const ast = h('ul') as TocList;
  const stack: TocList[] = [ast];

  headings.forEach(heading => {
    const depth = getDepth(heading) - min + 1;
    if (depth > MAX_DEPTH) return;

    while (stack.length < depth) {
      const ul = h('ul') as TocList;
      stack[stack.length - 1].children.push(h('li', null, ul) as TocList['children'][0]);
      stack.push(ul);
    }

    while (stack.length > depth) {
      stack.pop();
    }

    if (heading.properties) {
      const content = plain({ type: 'root', children: heading.children }) as string;
      const id = typeof heading.properties.id === 'string' ? heading.properties.id : '';
      stack[stack.length - 1].children.push(
        h('li', null, h('a', { href: `#${id}` }, content)) as TocList['children'][0],
      );
    }
  });

  return ast;
}

/**
 * Convert HTML string to React components
 * Similar to run.tsx but works with HTML instead of MDX
 */
const renderHtml = (htmlString: string, _opts: RenderHtmlOpts = {}): RMDXModule => {
  const { components = {}, terms, variables, baseUrl, theme, copyButtons } = _opts;

  // Parse HTML string to HAST
  const tree = fromHtml(htmlString, { fragment: true }) as Root;

  // Extract TOC from HAST
  const headings = extractToc(tree);
  const toc: IndexableElements[] = headings;

  // Prepare component mapping
  const exportedComponents = Object.entries(components).reduce((memo, [tag, mod]) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { default: Content, toc: _toc, Toc: _Toc, ...rest } = mod;
    memo[tag] = Content;
    if (rest) {
      Object.entries(rest).forEach(([subTag, component]) => {
        memo[subTag] = component;
      });
    }
    return memo;
  }, {});

  const componentMap = makeUseMDXComponents(exportedComponents);
  const componentsForRehype = componentMap();

  // Convert HAST to React using rehype-react via unified
  // @ts-expect-error - rehype-react types are incompatible with React.Fragment return type
  const processor = unified().use(rehypeReact, {
    createElement: React.createElement,
    Fragment: React.Fragment,
    components: componentsForRehype,
  });

  // Process the tree - rehype-react replaces stringify to return React elements
  // It may return a single element, fragment, or array
  const ReactContent = processor.stringify(tree) as unknown as React.ReactNode;

  // Generate TOC component if headings exist
  let Toc: React.FC<{ heading?: string }> | undefined;
  if (headings.length > 0) {
    const tocHast = tocToHast(headings);
    // @ts-expect-error - rehype-react types are incompatible with React.Fragment return type
    const tocProcessor = unified().use(rehypeReact, {
      createElement: React.createElement,
      Fragment: React.Fragment,
      components: { p: React.Fragment },
    });
    const tocReactElement = tocProcessor.stringify(tocHast) as unknown as React.ReactNode;

    const TocComponent = (props: { heading?: string }) =>
      tocReactElement ? (
        <Components.TableOfContents heading={props.heading}>{tocReactElement}</Components.TableOfContents>
      ) : null;
    TocComponent.displayName = 'Toc';
    Toc = TocComponent;
  }

  const DefaultComponent = () => (
    <Contexts baseUrl={baseUrl} copyButtons={copyButtons} terms={terms} theme={theme} variables={variables}>
      {ReactContent}
    </Contexts>
  );

  return {
    default: DefaultComponent,
    toc,
    Toc: Toc || (() => null),
    stylesheet: undefined,
  } as RMDXModule;
};

export default renderHtml;

