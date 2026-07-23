import type { CustomComponents, RMDXModule } from '../types';
import type { Root } from 'hast';
import type React from 'react';

import { extractToc, tocToHast } from '../processor/plugin/toc';

import { loadComponents } from './utils/mdxish/mdxish-load-components';
import {
  buildRMDXModule,
  createRehypeReactProcessor,
  exportComponentsForRehype,
  type RenderOpts,
} from './utils/mdxish/mdxish-render-utils';

export type { RenderOpts as RenderMdxishOpts };

/**
 * Converts a HAST tree to a React component.
 * @param tree - The HAST tree to convert
 * @param opts - The options for the render
 * @returns The React component
 *
 * @see .claude/context/MDXish/Processor Overview.md
 */
const renderMdxish = (tree: Root, opts: RenderOpts = {}): RMDXModule => {
  const { components: userComponents = {}, variables, ...contextOpts } = opts;

  const components: CustomComponents = {
    ...loadComponents(),
    ...userComponents,
  };

  const headings = extractToc(tree, components);
  const componentsForRehype = exportComponentsForRehype(components);

  // Merge any in-document bindings collected at compile time. Local scope wins
  // over caller-provided components
  const localScope = tree.data?.mdxishScope ?? {};
  Object.entries(localScope).forEach(([name, value]) => {
    componentsForRehype[name] = value as React.ComponentType;
  });

  const processor = createRehypeReactProcessor(componentsForRehype);
  const content = processor.stringify(tree) as React.ReactNode;

  const tocHast = headings.length > 0 ? tocToHast(headings, variables) : null;

  return buildRMDXModule(content, headings, tocHast, { ...contextOpts, variables });
};

export default renderMdxish;
