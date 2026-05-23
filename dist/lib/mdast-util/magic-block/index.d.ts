import type { Extension as FromMarkdownExtension } from 'mdast-util-from-markdown';
import type { Options as ToMarkdownExtension } from 'mdast-util-to-markdown';
export type { MagicBlockNode } from './types';
/**
 * Create an extension for `mdast-util-from-markdown` to enable magic blocks.
 *
 * Converts micromark magic block tokens into `magicBlock` MDAST nodes.
 *
 * @returns Extension for `mdast-util-from-markdown`
 */
export declare function magicBlockFromMarkdown(): FromMarkdownExtension;
/**
 * Create an extension for `mdast-util-to-markdown` to serialize magic blocks.
 *
 * Converts `magicBlock` MDAST nodes back to `[block:TYPE]JSON[/block]` syntax.
 *
 * @returns Extension for `mdast-util-to-markdown`
 */
export declare function magicBlockToMarkdown(): ToMarkdownExtension;
