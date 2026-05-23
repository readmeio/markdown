/**
 * Unified plugin that transforms `magicBlock` MDAST nodes into final nodes.
 *
 * This replaces the magicBlockRestorer plugin by working directly with
 * parsed `magicBlock` nodes from the micromark tokenizer instead of
 * finding placeholder tokens.
 */
import type { MagicBlockTransformerOptions } from './types';
import type { Root as MdastRoot } from 'mdast';
import type { Plugin } from 'unified';
/**
 * Unified plugin that transforms magicBlock nodes into final MDAST nodes.
 */
declare const magicBlockTransformer: Plugin<[MagicBlockTransformerOptions?], MdastRoot>;
export default magicBlockTransformer;
