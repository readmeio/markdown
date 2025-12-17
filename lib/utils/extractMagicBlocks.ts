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
     * Token is a wrapper around the key to serialize & influences how the block is parsed in the pipeline
     * with the temporary key
     * - Use backticks so it becomes a code span, preventing remarkParse from parsing
     *   special characters in the token as markdown syntax
     * - Prepend a newline to the token to ensure it is parsed as a block level node
     */
    const key = `__MAGIC_BLOCK_${index}__`;
    const token = `\n\`${key}\``;

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
  let content = replaced;

  // If a magic block is at the start of the document, the extraction token's prepended 
  // newline will have been trimmed during processing. We need to account for that here
  // to ensure the token is found and replaced correctly.
  const isTokenAtStart = content.startsWith(blocks[0]?.token.trimStart());
  if (isTokenAtStart) {
    content = `\n${content}`;
  }

  return blocks.reduce((acc, { token, raw }) => {
    return acc.split(token).join(raw);
  }, content);
}
