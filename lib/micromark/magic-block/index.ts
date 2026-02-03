/**
 * Micromark extension for magic block syntax.
 *
 * Usage:
 * ```ts
 * import { magicBlock } from './lib/micromark/magic-block';
 *
 * const processor = unified()
 *   .data('micromarkExtensions', [magicBlock()])
 * ```
 */
export { magicBlock } from './syntax';
