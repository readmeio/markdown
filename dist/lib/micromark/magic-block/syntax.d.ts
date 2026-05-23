/**
 * Micromark extension for magic block syntax: [block:TYPE]JSON[/block]
 *
 * This tokenizer recognizes magic blocks at parse time, making them first-class
 * AST nodes that work correctly in all markdown contexts (lists, blockquotes, etc.)
 *
 * Note: This file uses the standard micromark state machine pattern where state
 * functions return other state functions by name. This requires disabling the
 * no-use-before-define rule.
 */
import type { Extension } from 'micromark-util-types';
declare module 'micromark-util-types' {
    interface TokenTypeMap {
        magicBlock: 'magicBlock';
        magicBlockData: 'magicBlockData';
        magicBlockLineEnding: 'magicBlockLineEnding';
        magicBlockMarkerEnd: 'magicBlockMarkerEnd';
        magicBlockMarkerStart: 'magicBlockMarkerStart';
        magicBlockMarkerTypeEnd: 'magicBlockMarkerTypeEnd';
        magicBlockTrailing: 'magicBlockTrailing';
        magicBlockType: 'magicBlockType';
    }
}
/**
 * Create a micromark extension for magic block syntax.
 *
 * This extension handles both single-line and multiline magic blocks:
 * - Flow construct (concrete): Handles block-level multiline magic blocks at document level
 * - Text construct: Handles inline magic blocks in lists, paragraphs, etc.
 *
 * The flow construct is marked as "concrete" which prevents it from being
 * interrupted by container markers (like `>` for blockquotes or `-` for lists).
 */
export declare function magicBlock(): Extension;
export default magicBlock;
