import type { GlossaryTerm } from '../../contexts/GlossaryTerms';
import type { CustomComponents, IndexableElements, RMDXModule, TocList, Variables } from '../../types';

import Variable from '@readme/variable';
import React from 'react';
import rehypeReact from 'rehype-react';
import { unified } from 'unified';

import * as Components from '../../components';
import Contexts from '../../contexts';

import makeUseMDXComponents from './makeUseMdxComponents';

export interface RenderOpts {
  baseUrl?: string;
  components?: CustomComponents;
  copyButtons?: boolean;
  imports?: Record<string, unknown>;
  terms?: GlossaryTerm[];
  theme?: 'dark' | 'light';
  variables?: Variables;
}

/** Flatten CustomComponents into a component map for rehype-react */
export function exportComponentsForRehype(components: CustomComponents): Record<string, React.ComponentType> {
  const exported = Object.entries(components).reduce<Record<string, React.ComponentType>>((memo, [tag, mod]) => {
    const { default: Content, ...rest } = mod;
    memo[tag] = Content;

    // Add lowercase version for case-insensitive matching
    const lowerTag = tag.toLowerCase();
    if (lowerTag !== tag) memo[lowerTag] = Content;

    // Add sub-components if any
    Object.entries(rest).forEach(([subTag, component]) => {
      if (typeof component === 'function') {
        memo[subTag] = component as React.ComponentType;
        const lowerSubTag = subTag.toLowerCase();
        if (lowerSubTag !== subTag) memo[lowerSubTag] = component as React.ComponentType;
      }
    });

    return memo;
  }, {});

  const componentMap = makeUseMDXComponents(exported);
  const result = componentMap() as Record<string, React.ComponentType>;

  // Add Variable component for runtime user variable resolution
  result.Variable = Variable;
  result.variable = Variable;

  return result;
}

/** Create a rehype-react processor */
export function createRehypeReactProcessor(components: Record<string, React.ComponentType>) {
  // @ts-expect-error - rehype-react types are incompatible with React.Fragment return type
  return unified().use(rehypeReact, {
    createElement: React.createElement,
    Fragment: React.Fragment,
    components,
  });
}

/** Create a TOC React component from headings */
export function createTocComponent(tocHast: TocList): React.FC<{ heading?: string }> {
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

  return TocComponent;
}

/** Create the default wrapper component with contexts */
export function createDefaultComponent(
  content: React.ReactNode,
  opts: Pick<RenderOpts, 'baseUrl' | 'copyButtons' | 'terms' | 'theme' | 'variables'>,
): React.FC {
  const { baseUrl, copyButtons, terms, theme, variables } = opts;
  const DefaultComponent = () => (
    <Contexts baseUrl={baseUrl} copyButtons={copyButtons} terms={terms} theme={theme} variables={variables}>
      {content}
    </Contexts>
  );
  DefaultComponent.displayName = 'DefaultComponent';
  return DefaultComponent;
}

/** Build the RMDXModule result object */
export function buildRMDXModule(
  content: React.ReactNode,
  headings: IndexableElements[],
  tocHast: TocList | null,
  opts: Pick<RenderOpts, 'baseUrl' | 'copyButtons' | 'terms' | 'theme' | 'variables'>,
): RMDXModule {
  const DefaultComponent = createDefaultComponent(content, opts);
  const Toc = tocHast ? createTocComponent(tocHast) : () => null;

  return {
    default: DefaultComponent,
    toc: headings,
    Toc,
    stylesheet: undefined,
  } as RMDXModule;
}
