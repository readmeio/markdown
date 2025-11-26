import type { GlossaryTerm } from '../contexts/GlossaryTerms';
import type { CustomComponents, HastHeading, IndexableElements, RMDXModule, TocList, Variables } from '../types';
import type { Root } from 'hast';

import Variable from '@readme/variable';
import { h } from 'hastscript';
import React from 'react';
import rehypeReact from 'rehype-react';
import rehypeSlug from 'rehype-slug';
import { unified } from 'unified';

import * as Components from '../components';
import Contexts from '../contexts';

import plain from './plain';
import { loadComponents } from './utils/load-components';
import makeUseMDXComponents from './utils/makeUseMdxComponents';

// Re-export opts type for convenience
export interface RenderMdxishOpts {
  baseUrl?: string;
  components?: CustomComponents;
  copyButtons?: boolean;
  imports?: Record<string, unknown>;
  terms?: GlossaryTerm[];
  theme?: 'dark' | 'light';
  variables?: Variables;
}

const MAX_DEPTH = 2;
const getDepth = (el: HastHeading) => parseInt(el.tagName?.match(/^h(\d)/)?.[1] || '1', 10);

const slugify = (text: string) =>
  text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');

const ensureHeadingIds = (tree: Root) => {
  const assignId = (node: Root | Root['children'][number]) => {
    if (node.type === 'element' && /^h[1-6]$/.test(node.tagName)) {
      node.properties = node.properties || {};
      if (!node.properties.id) {
        const text = plain({ type: 'root', children: node.children }) as string;
        node.properties.id = slugify(text);
      }
    }

    if ('children' in node && Array.isArray(node.children)) {
      node.children.forEach(child => {
        assignId(child);
      });
    }
  };

  assignId(tree);
};

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
      node.children.forEach(child => {
        traverse(child);
      });
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

  const sluggedTree = unified().use(rehypeSlug).runSync(tree) as Root;
  ensureHeadingIds(sluggedTree);

  const headings = extractToc(sluggedTree);
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

  const headingWithId = (Tag: keyof JSX.IntrinsicElements, Wrapped: React.ElementType | undefined) => {
    const HeadingComponent = (props: React.HTMLAttributes<HTMLHeadingElement>) => {
      // eslint-disable-next-line react/prop-types
      const { id, children, ...rest } = props;
      const text =
        typeof children === 'string'
          ? children
          : React.Children.toArray(children)
              .filter(child => !(typeof child === 'string' && child.trim() === ''))
              .map(child => (typeof child === 'string' ? child : ''))
              .join(' ');
      const resolvedId = id || slugify(text);
      const Base = Wrapped || Tag;
      return React.createElement(Base, { id: resolvedId, ...rest }, children);
    };
    HeadingComponent.displayName = `HeadingWithId(${Tag})`;
    return HeadingComponent;
  };

  componentsForRehype.h1 = headingWithId('h1', componentsForRehype.h1 as React.ElementType | undefined);
  componentsForRehype.h2 = headingWithId('h2', componentsForRehype.h2 as React.ElementType | undefined);
  componentsForRehype.h3 = headingWithId('h3', componentsForRehype.h3 as React.ElementType | undefined);
  componentsForRehype.h4 = headingWithId('h4', componentsForRehype.h4 as React.ElementType | undefined);
  componentsForRehype.h5 = headingWithId('h5', componentsForRehype.h5 as React.ElementType | undefined);
  componentsForRehype.h6 = headingWithId('h6', componentsForRehype.h6 as React.ElementType | undefined);

  // Add Variable component for user variable resolution at runtime
  // Both uppercase and lowercase since HTML normalizes tag names to lowercase
  componentsForRehype.Variable = Variable;
  componentsForRehype.variable = Variable;

  // @ts-expect-error - rehype-react types are incompatible with React.Fragment return type
  const processor = unified().use(rehypeReact, {
    createElement: React.createElement,
    Fragment: React.Fragment,
    components: componentsForRehype,
  });

  const ReactContent = processor.stringify(sluggedTree) as React.ReactNode;

  let Toc: React.FC<{ heading?: string }> | undefined;
  if (headings.length > 0) {
    const tocHast = tocToHast(headings);
    // @ts-expect-error - rehype-react types are incompatible with React.Fragment return type
    const tocProcessor = unified().use(rehypeReact, {
      createElement: React.createElement,
      Fragment: React.Fragment,
      components: { p: React.Fragment },
    });
    const tocReactElement = tocProcessor.stringify(tocHast) as React.ReactNode;

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
