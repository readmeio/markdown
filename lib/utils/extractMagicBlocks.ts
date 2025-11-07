interface BlockHit { raw: string; token: string; }

const MAGIC_BLOCK_REGEX = /\[block:([^\]]*)\]([^]+?)\[\/block\]/g;

/**
 * Extract legacy magic block syntax from a markdown string.
 * Returns the modified markdown and an array of extracted blocks.
 */
export function extractMagicBlocks(markdown: string) {
  const blocks: BlockHit[] = [];
  let index = 0;

  const replaced = markdown.replace(MAGIC_BLOCK_REGEX, (match) => {
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
export function restoreMagicBlocks(output: string, blocks: BlockHit[]) {
  return blocks.reduce((acc, { token, raw }) => {
    return acc.split(token).join(raw);
  }, output);
}
