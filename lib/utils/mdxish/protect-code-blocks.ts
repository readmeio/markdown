export interface ProtectedCode {
  codeBlocks: string[];
  inlineCode: string[];
}

export interface ProtectCodeBlocksResult {
  protectedCode: ProtectedCode;
  protectedContent: string;
}

// A fence opener: container prefix (indent, `>`, list marker), then 3+ backticks or tildes, then the info string.
// Indented code is disabled in mdxish, so any indent opens a fence.
const FENCE_OPENER_REGEX = /^([ \t>]*(?:(?:[-*+]|\d{1,9}[.)])[ \t]+)?)(`{3,}|~{3,})([^\n]*)$/;

// A fence closer: container prefix, then 3+ backticks or tildes alone on the line.
const FENCE_CLOSER_REGEX = /^[ \t>]*(`{3,}|~{3,})\s*$/;

/** The fence (e.g. ```` ``` ````) a line opens, with its container prefix, or null. */
function matchFenceOpener(line: string) {
  const [, prefix, fence, info] = FENCE_OPENER_REGEX.exec(line) ?? [];
  // CommonMark: a backtick fence's info string can't contain backticks (```` ```js``` ```` is inline code).
  if (fence === undefined || (fence[0] === '`' && info.includes('`'))) return null;
  return { fence, prefix };
}

/** The bare fence (e.g. `~~~~`) a line could close with, or undefined. */
const closerOf = (line: string) => FENCE_CLOSER_REGEX.exec(line)?.[1];

/**
 * Per line, the longest closer of each fence character on any later line. Lets an
 * unclosed opener be skipped without rescanning the rest of the doc.
 */
function findLongestLaterClosers(lines: string[]) {
  // Keyed by fence character (`` ` `` or `~`).
  const longest: Record<string, number> = { '`': 0, '~': 0 };
  const perLine: Record<string, number>[] = [];
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    perLine[i] = { ...longest };
    const closer = closerOf(lines[i]);
    if (closer) longest[closer[0]] = Math.max(longest[closer[0]], closer.length);
  }
  return perLine;
}

/** Index of the first line after `from` that closes `fence`: same character, at least as long. */
function findFenceCloser(lines: string[], from: number, fence: string) {
  for (let i = from + 1; i < lines.length; i += 1) {
    const closer = closerOf(lines[i]);
    if (closer !== undefined && closer[0] === fence[0] && closer.length >= fence.length) return i;
  }
  return -1;
}

/**
 * Replaces each fenced code block with a `___CODE_BLOCK_n___` placeholder, keeping the
 * opener's container prefix and the closer's trailing whitespace outside it. An unclosed
 * opener (e.g. one its blockquote ends) is left as text and scanning continues.
 */
function protectFencedBlocks(content: string, codeBlocks: string[]) {
  const lines = content.split('\n');
  const longestLaterClosers = findLongestLaterClosers(lines);
  const result: string[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const opener = matchFenceOpener(lines[i]);
    const isClosed = opener && longestLaterClosers[i][opener.fence[0]] >= opener.fence.length;

    if (isClosed) {
      const closeIndex = findFenceCloser(lines, i, opener.fence);
      const closer = lines[closeIndex].trimEnd();
      const block = [lines[i].slice(opener.prefix.length), ...lines.slice(i + 1, closeIndex), closer].join('\n');
      result.push(`${opener.prefix}___CODE_BLOCK_${codeBlocks.length}___${lines[closeIndex].slice(closer.length)}`);
      codeBlocks.push(block);
      i = closeIndex;
    } else {
      result.push(lines[i]);
    }
  }
  return result.join('\n');
}

/**
 * Replaces code blocks and inline code with placeholders to protect them from preprocessing.
 *
 * @param content - The markdown content to process
 * @returns Object containing protected content and arrays of original code blocks
 * @example
 * ```typescript
 * const input = 'Text with `inline code`\n```js\nfenced block\n```';
 * protectCodeBlocks(input)
 * // Returns: {
 * //   protectedCode: {
 * //     codeBlocks: ['```js\nfenced block\n```'],
 * //     inlineCode: ['`inline code`']
 * //   },
 * //   protectedContent: 'Text with ___INLINE_CODE_0___\n___CODE_BLOCK_0___'
 * // }
 * ```
 */
export function protectCodeBlocks(content: string): ProtectCodeBlocksResult {
  const codeBlocks: string[] = [];
  const inlineCode: string[] = [];

  let protectedContent = protectFencedBlocks(content, codeBlocks);

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
