import type { Root } from 'hast';
/**
 * Rehype plugin that constructs ids for headings
 * Id's are used to construct slug anchor links & Table of Contents during rendering
 * Use the text / nodes that make up the heading to generate the id
 */
declare const generateSlugForHeadings: () => (tree: Root) => Root;
export default generateSlugForHeadings;
