import type { GlossaryTerm } from '../../../contexts/GlossaryTerms';
import type { CustomComponents, IndexableElements, RMDXModule, TocList, Variables } from '../../../types';
import type { Element } from 'hast';

import Variable from '@readme/variable';
import React from 'react';
import rehypeReact from 'rehype-react';
import { unified } from 'unified';

import * as Components from '../../../components';
import Contexts from '../../../contexts';
import makeUseMDXComponents from '../makeUseMdxComponents';

export interface RenderOpts {
  baseUrl?: string;
  components?: CustomComponents;
  copyButtons?: boolean;
  imports?: Record<string, unknown>;
  terms?: GlossaryTerm[];
  theme?: 'dark' | 'light';
  useTailwind?: boolean;
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

/**
 * Shape that rehype-react v6 produces when `passNode: true` is set: `props.node`
 * points at the original hast element for any node matched by the components map.
 * The rest of the props are whatever hast-to-hyperscript derived from attributes.
 */
type PropsWithHastNode = Record<string, unknown> & { node?: Element };

/**
 * Custom React.createElement wrapper that recovers real JS prop values for
 * custom components. rehype-react v6 uses hast-to-hyperscript, which stringifies
 * array-valued hast properties to space-separated strings (for className-style
 * semantics). That breaks any component prop that is genuinely an array. With
 * `passNode: true` we get the original hast node in `props.node` for components
 * and can read the raw properties directly.
 */
function createElementPreservingHastProps(
  type: React.ElementType,
  props: PropsWithHastNode | null,
  ...children: React.ReactNode[]
): React.ReactElement {
  if (props?.node?.properties) {
    const { node, ...rest } = props;
    return React.createElement(type, { ...rest, ...node.properties }, ...children);
  }
  return React.createElement(type, props, ...children);
}

/** Create a rehype-react processor */
export function createRehypeReactProcessor(components: Record<string, React.ComponentType>) {
  // @ts-expect-error - rehype-react types are incompatible with React.Fragment return type
  return unified().use(rehypeReact, {
    createElement: createElementPreservingHastProps,
    Fragment: React.Fragment,
    components,
    passNode: true,
  });
}

/** Create a TOC React component from headings */
export function createTocComponent(tocHast: TocList): React.FC {
  // @ts-expect-error - rehype-react types are incompatible with React.Fragment return type
  const tocProcessor = unified().use(rehypeReact, {
    createElement: React.createElement,
    Fragment: React.Fragment,
    components: { p: React.Fragment },
  });
  const tocReactElement = tocProcessor.stringify(tocHast) as React.ReactNode;

  const TocComponent = () =>
    tocReactElement ? (
      <Components.TableOfContents>{tocReactElement}</Components.TableOfContents>
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
