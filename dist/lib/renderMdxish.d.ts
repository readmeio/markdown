import type { RMDXModule } from '../types';
import type { Root } from 'hast';
import { type RenderOpts } from './utils/mdxish/mdxish-render-utils';
export type { RenderOpts as RenderMdxishOpts };
/**
 * Converts a HAST tree to a React component.
 * @param tree - The HAST tree to convert
 * @param opts - The options for the render
 * @returns The React component
 *
 * @see {@link https://github.com/readmeio/rmdx/blob/main/docs/mdxish-flow.md}
 */
declare const renderMdxish: (tree: Root, opts?: RenderOpts) => RMDXModule;
export default renderMdxish;
