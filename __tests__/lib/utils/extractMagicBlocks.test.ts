import { extractMagicBlocks, restoreMagicBlocks } from '../../../lib/utils/extractMagicBlocks';

describe('extractMagicBlocks', () => {
  it('should extract magic blocks from markdown', () => {
    const input = `
# Title
Paragraph text.
[block:html]
{
  "html": "<h1>Hoo ha</h1>"
}
[/block]

More text.
[block:html]
{
  "html": "<b>second block</b>"
}
[/block]
End text.`;
    const { replaced, blocks } = extractMagicBlocks(input);

    expect(replaced).toBe(`
# Title
Paragraph text.
\`__MAGIC_BLOCK_0__\`

More text.
\`__MAGIC_BLOCK_1__\`
End text.`);

    expect(blocks).toStrictEqual([
      {
        token: '`__MAGIC_BLOCK_0__`',
        raw: expect.stringContaining('<h1>Hoo ha</h1>'),
      },
      {
        token: '`__MAGIC_BLOCK_1__`',
        raw: expect.stringContaining('<b>second block</b>'),
      },
    ]);
  });
});

describe('restoreMagicBlocks', () => {
  it('should restore magic blocks in markdown', () => {
    const replaced = `
# Title
Paragraph text.
\`__MAGIC_BLOCK_0__\`

More text.
\`__MAGIC_BLOCK_1__\`
End text.`;
    const blocks = [
      {
        token: '`__MAGIC_BLOCK_0__`',
        raw: `[block:html]
{
  "html": "<h1>Hoo ha</h1>"
}
[/block]`,
      },
      {
        token: '`__MAGIC_BLOCK_1__`',
        raw: `[block:html]
{
  "html": "<b>second block</b>"
}
[/block]`,
      },
    ];

    const restored = restoreMagicBlocks(replaced, blocks);

    expect(restored).toBe(`
# Title
Paragraph text.
[block:html]
{
  "html": "<h1>Hoo ha</h1>"
}
[/block]

More text.
[block:html]
{
  "html": "<b>second block</b>"
}
[/block]
End text.`);
  });
});
