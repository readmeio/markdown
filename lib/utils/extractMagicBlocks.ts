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
const MAGIC_BLOCK_REGEX = /\[block:[^\]]{1,100}\](?:(?!\[block:)(?!\[\/block\])[\s\S])*\[\/block\]/g;

/**
 * Extract legacy magic block syntax from a markdown string.
 * Returns the modified markdown and an array of extracted blocks.
 */
export function extractMagicBlocks(markdown: string) {
  const blocks: BlockHit[] = [];
  let index = 0;

  const replaced = markdown.replace(MAGIC_BLOCK_REGEX, match => {
    /**
     * Key is the unique identifier for the magic block
     */
    const key = `__MAGIC_BLOCK_${index}__`;

    /**
     * Token is a wrapper around the `key` to serialize & influence how the
     * magic block is parsed in the remark pipeline.
     * - Use backticks so it becomes a code span, preventing `remarkParse` from
     *   parsing special characters in the token as markdown syntax
     * - Prepend a newline to ensure it is parsed as a block level node
     * - Append a newline to ensure it is separated from following content
     */
    const token = `\n\`${key}\`\n`;

    blocks.push({ key, raw: match, token });
    index += 1;
    return token;
  });

  return { replaced, blocks };
}

/**
 * Restore extracted magic blocks back into a markdown string.
 */
export function restoreMagicBlocks(replaced: string, blocks: BlockHit[]) {
  // If a magic block is at the start or end of the document, the extraction
  // token's newlines will have been trimmed during processing. We need to
  // account for that here to ensure the token is found and replaced correctly.
  // These extra newlines will be removed again when the final string is trimmed.
  const content = `\n${replaced}\n`;

  const restoredContent = blocks.reduce((acc, { token, raw }) => {
    // Ensure each magic block is separated by newlines when restored.
    return acc.split(token).join(`\n${raw}\n`);
  }, content);

  return restoredContent.trim();
}
