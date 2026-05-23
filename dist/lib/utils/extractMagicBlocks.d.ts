export interface BlockHit {
    key: string;
    raw: string;
    token: string;
}
/**
 * The content matching in this regex captures everything between `[block:TYPE]`
 * and `[/block]`, including new lines. Negative lookahead for the closing
 * `[/block]` tag is required to prevent greedy matching to ensure it stops at
 * the first closing tag it encounters preventing vulnerability to polynomial
 * backtracking issues.
 */
export declare const MAGIC_BLOCK_REGEX: RegExp;
/**
 * Extract legacy magic block syntax from a markdown string.
 * Returns the modified markdown and an array of extracted blocks.
 */
export declare function extractMagicBlocks(markdown: string): {
    replaced: string;
    blocks: BlockHit[];
};
/**
 * Restore extracted magic blocks back into a markdown string.
 */
export declare function restoreMagicBlocks(replaced: string, blocks: BlockHit[]): string;
