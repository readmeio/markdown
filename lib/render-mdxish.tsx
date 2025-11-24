import type { CustomComponents, HastHeading, IndexableElements, RMDXModule, TocList } from '../types';
import type { Root } from 'hast';

import { h } from 'hastscript';
import React from 'react';
import rehypeReact from 'rehype-react';
import { unified } from 'unified';

import * as Components from '../components';
import Contexts from '../contexts';

import plain from './plain';
import { type RenderHtmlOpts } from './render-html';
import { loadComponents } from './utils/load-components';
import makeUseMDXComponents from './utils/makeUseMdxComponents';

// Re-export opts type for convenience
export type RenderMdxishOpts = RenderHtmlOpts;

const MAX_DEPTH = 2;
const getDepth = (el: HastHeading) => parseInt(el.tagName?.match(/^h(\d)/)?.[1] || '1', 10);

/**
 * Extract headings (h1-h6) from HAST for table of contents
 */
function extractToc(tree: Root): HastHeading[] {
  const headings: HastHeading[] = [];

  const traverse = (node: Root | Root['children'][number]): void => {
    if (node.type === 'element' && ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(node.tagName)) {
      headings.push(node as HastHeading);
    }

    if ('children' in node && Array.isArray(node.children)) {
      node.children.forEach(child => traverse(child));
    }
  };

  traverse(tree);
  return headings;
}

/**
 * Convert headings to TOC HAST structure (similar to tocToHast in render-html.tsx)
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
 * Convert an existing HAST root to React components.
 * Similar to renderHtml but assumes HAST is already available.
 */
const renderMdxish = (tree: Root, _opts: RenderMdxishOpts = {}): RMDXModule => {
  const { components: userComponents = {}, terms, variables, baseUrl, theme, copyButtons } = _opts;

  const autoLoadedComponents = loadComponents();
  const components: CustomComponents = {
    ...autoLoadedComponents,
    ...userComponents,
  };

  const headings = extractToc(tree);
  const toc: IndexableElements[] = headings;

  const exportedComponents = Object.entries(components).reduce((memo, [tag, mod]) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { default: Content, toc: _toc, Toc: _Toc, ...rest } = mod;
    memo[tag] = Content;
    const lowerTag = tag.toLowerCase();
    if (lowerTag !== tag) {
      memo[lowerTag] = Content;
    }
    if (rest) {
      Object.entries(rest).forEach(([subTag, component]) => {
        memo[subTag] = component;
        const lowerSubTag = subTag.toLowerCase();
        if (lowerSubTag !== subTag) {
          memo[lowerSubTag] = component;
        }
      });
    }
    return memo;
  }, {});

  const componentMap = makeUseMDXComponents(exportedComponents);
  const componentsForRehype = componentMap();

  // @ts-expect-error - rehype-react types are incompatible with React.Fragment return type
  const processor = unified().use(rehypeReact, {
    createElement: React.createElement,
    Fragment: React.Fragment,
    components: componentsForRehype,
  });

  const ReactContent = processor.stringify(tree) as unknown as React.ReactNode;

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

export default renderMdxish;

