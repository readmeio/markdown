import type { Transform } from 'mdast-util-from-markdown';
/**
 * Transforms HTMLBlock MDX JSX to html-block nodes. Handles <HTMLBlock>{`...`}</HTMLBlock> syntax.
 */
declare const mdxishHtmlBlocks: () => Transform;
export default mdxishHtmlBlocks;
