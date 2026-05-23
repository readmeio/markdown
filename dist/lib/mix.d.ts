import type { MdxishOpts } from './mdxish';
/** Wrapper around mdxish that returns an HTML string instead of a HAST tree. */
declare const mix: (text: string, opts?: MdxishOpts) => string;
export default mix;
