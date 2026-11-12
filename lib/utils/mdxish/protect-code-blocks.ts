export interface ProtectedCode {
  codeBlocks: string[];
  inlineCode: string[];
}

export interface ProtectCodeBlocksResult {
  protectedCode: ProtectedCode;
  protectedContent: string;
}

// CommonMark fences open with either backticks or tildes; a fence closes with its own marker.
const FENCE_MARKERS = ['```', '~~~'] as const;

/** Earliest backtick or tilde fence marker in `text`, or null if there is none. */
function findNextFence(text: string) {
  return FENCE_MARKERS.reduce<{ marker: string; start: number } | null>((earliest, marker) => {
    const start = text.indexOf(marker);
    if (start === -1 || (earliest && earliest.start <= start)) return earliest;
    return { marker, start };
  }, null);
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
export function protectCodeBlocks(content: string): ProtectCodeBlocksResult {
  const codeBlocks: string[] = [];
  const inlineCode: string[] = [];

  let protectedContent = '';
  let remaining = content;
  let fence = findNextFence(remaining);

  while (fence) {
    protectedContent += remaining.slice(0, fence.start);
    remaining = remaining.slice(fence.start);

    const codeBlockEnd = remaining.indexOf(fence.marker, 3);
    if (codeBlockEnd === -1) {
      break;
    }

    const match = remaining.slice(0, codeBlockEnd + 3);
    const index = codeBlocks.length;
    codeBlocks.push(match);
    protectedContent += `___CODE_BLOCK_${index}___`;

    remaining = remaining.slice(codeBlockEnd + 3);
    fence = findNextFence(remaining);
  }
  protectedContent += remaining;

  protectedContent = protectedContent.replace(/`([^`\n]+)`/g, match => {
    const index = inlineCode.length;
    inlineCode.push(match);
    return `___INLINE_CODE_${index}___`;
  });

  return { protectedCode: { codeBlocks, inlineCode }, protectedContent };
}

/**
 * Restores inline code by replacing placeholders with original content.
 *
 * @param content - Content with inline code placeholders
 * @param protectedCode - The protected code arrays
 * @returns Content with inline code restored
 */
export function restoreInlineCode(content: string, protectedCode: ProtectedCode): string {
  return content.replace(/___INLINE_CODE_(\d+)___/g, (_m, idx: string) => {
    return protectedCode.inlineCode[parseInt(idx, 10)];
  });
}

/**
 * Restores fenced code blocks by replacing placeholders with original content.
 *
 * @param content - Content with code block placeholders
 * @param protectedCode - The protected code arrays
 * @returns Content with code blocks restored
 */
export function restoreFencedCodeBlocks(content: string, protectedCode: ProtectedCode): string {
  return content.replace(/___CODE_BLOCK_(\d+)___/g, (_m, idx: string) => {
    return protectedCode.codeBlocks[parseInt(idx, 10)];
  });
}

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
export function restoreCodeBlocks(content: string, protectedCode: ProtectedCode): string {
  let restored = restoreFencedCodeBlocks(content, protectedCode);
  restored = restoreInlineCode(restored, protectedCode);
  return restored;
}
