import { scanPascalCaseTags } from './utils/scanPascalCaseTags';

/**
 * Returns unique PascalCase custom component names in an MDXish document.
 * Uses a linear scan (skips fenced/inline code and magic blocks) instead of a
 * full MDAST parse.
 */
const tags = (doc: string): string[] => scanPascalCaseTags(doc, { skipMagicBlocks: true });

export default tags;
