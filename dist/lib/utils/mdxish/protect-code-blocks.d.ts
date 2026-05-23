export interface ProtectedCode {
    codeBlocks: string[];
    inlineCode: string[];
}
export interface ProtectCodeBlocksResult {
    protectedCode: ProtectedCode;
    protectedContent: string;
}
/**
 * Replaces code blocks and inline code with placeholders to protect them from preprocessing.
 *
 * @param content - The markdown content to process
 * @returns Object containing protected content and arrays of original code blocks
 * @example
 * ```typescript
 * const input = 'Text with `inline code` and ```fenced block```';
 * protectCodeBlocks(input)
 * // Returns: {
 * //   protectedCode: {
 * //     codeBlocks: ['```fenced block```'],
 * //     inlineCode: ['`inline code`']
 * //   },
 * //   protectedContent: 'Text with ___INLINE_CODE_0___ and ___CODE_BLOCK_0___'
 * // }
 * ```
 */
export declare function protectCodeBlocks(content: string): ProtectCodeBlocksResult;
/**
 * Restores inline code by replacing placeholders with original content.
 *
 * @param content - Content with inline code placeholders
 * @param protectedCode - The protected code arrays
 * @returns Content with inline code restored
 */
export declare function restoreInlineCode(content: string, protectedCode: ProtectedCode): string;
/**
 * Restores fenced code blocks by replacing placeholders with original content.
 *
 * @param content - Content with code block placeholders
 * @param protectedCode - The protected code arrays
 * @returns Content with code blocks restored
 */
export declare function restoreFencedCodeBlocks(content: string, protectedCode: ProtectedCode): string;
/**
 * Restores all code blocks and inline code by replacing placeholders with original content.
 *
 * @param content - Content with code placeholders
 * @param protectedCode - The protected code arrays
 * @returns Content with all code blocks and inline code restored
 * @example
 * ```typescript
 * const content = 'Text with ___INLINE_CODE_0___ and ___CODE_BLOCK_0___';
 * const protectedCode = {
 *   codeBlocks: ['```js\ncode\n```'],
 *   inlineCode: ['`inline`']
 * };
 * restoreCodeBlocks(content, protectedCode)
 * // Returns: 'Text with `inline` and ```js\ncode\n```'
 * ```
 */
export declare function restoreCodeBlocks(content: string, protectedCode: ProtectedCode): string;
