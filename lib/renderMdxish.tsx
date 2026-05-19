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
 * @see {@link https://github.com/readmeio/rmdx/blob/main/docs/mdxish-flow.md}
 */
const renderMdxish = (tree: Root, opts: RenderOpts = {}): RMDXModule => {
  const { components: userComponents = {}, variables, ...contextOpts } = opts;

  const components: CustomComponents = {
    ...loadComponents(),
    ...userComponents,
  };

  const headings = extractToc(tree, components);
  const componentsForRehype = exportComponentsForRehype(components);

  // Merge any in-document `export function` components collected at compile
  // time. Local scope wins over caller-provided components so a doc can shadow
  // a built-in component by re-declaring it.
  const localComponents = tree.data?.mdxishScope?.components ?? {};
  Object.entries(localComponents).forEach(([name, value]) => {
    componentsForRehype[name] = value;
  });

  const processor = createRehypeReactProcessor(componentsForRehype);
  const content = processor.stringify(tree) as React.ReactNode;

  const tocHast = headings.length > 0 ? tocToHast(headings, variables) : null;

  return buildRMDXModule(content, headings, tocHast, { ...contextOpts, variables });
};

export default renderMdxish;
