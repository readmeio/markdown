export interface ProtectedCode {
  codeBlocks: string[];
  inlineCode: string[];
}

export interface ProtectCodeBlocksResult {
  protectedCode: ProtectedCode;
  protectedContent: string;
}

// Container prefix: indents, `>` markers and list markers, nested in any order (`- > `, `1. - `).
// Each alternative starts with a different character, so matching stays linear.
const CONTAINER_PREFIX_REGEX = /^(?:[ \t>]|(?:[-*+]|\d{1,9}[.)])[ \t])*/;

// A fence opener: container prefix, then 3+ backticks or tildes, then the info string.
// Indented code is disabled in mdxish, so any indent opens a fence.
const FENCE_OPENER_REGEX = /^((?:[ \t>]|(?:[-*+]|\d{1,9}[.)])[ \t])*)(`{3,}|~{3,})([^\n]*)$/;

// A fence closer: indents and `>` markers, then 3+ backticks or tildes alone on the line.
const FENCE_CLOSER_REGEX = /^([ \t>]*)(`{3,}|~{3,})\s*$/;

/** Number of `>` markers in a container prefix. */
const quoteDepth = (prefix: string) => prefix.split('>').length - 1;

/** The fence (e.g. ```` ``` ````) a line opens, with its container prefix, or null. */
function matchFenceOpener(line: string) {
  const [, prefix, fence, info] = FENCE_OPENER_REGEX.exec(line) ?? [];
  // CommonMark: a backtick fence's info string can't contain backticks (```` ```js``` ```` is inline code).
  if (fence === undefined || (fence[0] === '`' && info.includes('`'))) return null;
  return { fence, prefix };
}

/** True when `line` closes `fence` at quote depth `depth`: same character, at least as long. */
function closesFence(line: string, fence: string, depth: number) {
  const [, prefix, closer] = FENCE_CLOSER_REGEX.exec(line) ?? [];
  return (
    closer !== undefined && closer[0] === fence[0] && closer.length >= fence.length && quoteDepth(prefix) === depth
  );
}

/**
 * Finds the line closing a fence opened on `from`. The search stops where the opener's
 * blockquote ends. Failed searches are memoized per fence character and depth, so
 * repeated unclosed openers don't each rescan the rest of the doc.
 */
function createFenceCloserFinder(lines: string[]) {
  const failures = new Map<string, { length: number; stopAt: number }>();
  return (from: number, fence: string, depth: number) => {
    const key = `${fence[0]}${depth}`;
    const failure = failures.get(key);
    if (failure && from < failure.stopAt && fence.length >= failure.length) return -1;

    let i = from + 1;
    for (; i < lines.length && quoteDepth(CONTAINER_PREFIX_REGEX.exec(lines[i])?.[0] ?? '') >= depth; i += 1) {
      if (closesFence(lines[i], fence, depth)) return i;
    }
    failures.set(key, { length: fence.length, stopAt: i });
    return -1;
  };
}

/**
 * Replaces each fenced code block with a `___CODE_BLOCK_n___` placeholder, keeping the
 * opener's container prefix and the closer's trailing whitespace outside it. An unclosed
 * opener (e.g. one its blockquote ends) is left as text and scanning continues.
 */
function protectFencedBlocks(content: string, codeBlocks: string[]) {
  const lines = content.split('\n');
  const findCloser = createFenceCloserFinder(lines);
  const result: string[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const opener = matchFenceOpener(lines[i]);
    const closeIndex = opener ? findCloser(i, opener.fence, quoteDepth(opener.prefix)) : -1;

    if (opener && closeIndex !== -1) {
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
