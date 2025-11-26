import type { GlossaryTerm } from '../contexts/GlossaryTerms';
import type { CustomComponents, HastHeading, RMDXModule, Variables } from '../types';
import type { Root } from 'hast';

import React from 'react';
import rehypeReact from 'rehype-react';
import { unified } from 'unified';

import * as Components from '../components';
import Contexts from '../contexts';
import { tocToHast } from '../processor/plugin/toc';

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

const MAX_DEPTH = 3;

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
  const toc = headings;

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

  const ReactContent = processor.stringify(tree) as React.ReactNode;

  let Toc: React.FC<{ heading?: string }> | undefined;
  if (headings.length > 0) {
    const tocHast = tocToHast(headings, MAX_DEPTH);
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
