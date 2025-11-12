interface BlockHit {
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
const MAGIC_BLOCK_REGEX = /\[block:.+\](?:(?!\[block:)(?!\[\/block\])[\s\S])*\[\/block\]/g;

/**
 * Extract legacy magic block syntax from a markdown string.
 * Returns the modified markdown and an array of extracted blocks.
 */
export function extractMagicBlocks(markdown: string) {
  const blocks: BlockHit[] = [];
  let index = 0;

  const replaced = markdown.replace(MAGIC_BLOCK_REGEX, match => {
    // Use backticks so it becomes a code span, preventing remarkParse from
    // parsing special characters in the token as markdown syntax
    const token = `\`__MAGIC_BLOCK_${index}__\``;

    blocks.push({ token, raw: match });
    index += 1;
    return token;
  });

  return { replaced, blocks };
}

/**
 * Restore extracted magic blocks back into a markdown string.
 */
export function restoreMagicBlocks(replaced: string, blocks: BlockHit[]) {
  return blocks.reduce((acc, { token, raw }) => {
    return acc.split(token).join(raw);
  }, replaced);
}
