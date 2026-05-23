import type { Transform } from 'mdast-util-from-markdown';
/**
 * Mdxish-specific version of `tablesToJsx`. Differs from the shared MDX version:
 *
 * - Excludes `html` nodes from triggering JSX conversion because raw HTML
 *   inside JSX `<Table>` breaks remarkMdx parsing on the deserialization roundtrip.
 * - Skips empty cells instead of aborting the entire visit so that flow content
 *   in later cells is still detected.
 */
declare const mdxishTablesToJsx: () => Transform;
export default mdxishTablesToJsx;
