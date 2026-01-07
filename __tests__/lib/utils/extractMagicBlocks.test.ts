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
\n\`__MAGIC_BLOCK_0__\`\n

More text.
\n\`__MAGIC_BLOCK_1__\`\n
End text.`);

    expect(blocks).toStrictEqual([
      {
        key: '__MAGIC_BLOCK_0__',
        token: '\n`__MAGIC_BLOCK_0__`\n',
        raw: expect.stringContaining('<h1>Hoo ha</h1>'),
      },
      {
        key: '__MAGIC_BLOCK_1__',
        token: '\n`__MAGIC_BLOCK_1__`\n',
        raw: expect.stringContaining('<b>second block</b>'),
      },
    ]);
  });

  it('should not extract block tags with no closing tag', () => {
    const input = `
# Title
[block:html]
[block:html]

[block:html]
{ "html": "<h1>Hoo ha</h1>" }
[/block]
end`;
    const { replaced, blocks } = extractMagicBlocks(input);
    expect(replaced).toBe(`
# Title
[block:html]
[block:html]

\n\`__MAGIC_BLOCK_0__\`\n
end`);
    expect(blocks).toStrictEqual([
      {
        key: '__MAGIC_BLOCK_0__',
        token: '\n`__MAGIC_BLOCK_0__`\n',
        raw: expect.stringContaining('<h1>Hoo ha</h1>'),
      },
    ]);
  });
});

describe('restoreMagicBlocks', () => {
  it('should restore magic blocks in markdown', () => {
    const replaced = `
# Title
Paragraph text.
\n\`__MAGIC_BLOCK_0__\`\n
More text.
\n\`__MAGIC_BLOCK_1__\`\n
End text.`;
    const blocks = [
      {
        key: '__MAGIC_BLOCK_0__',
        token: '\n`__MAGIC_BLOCK_0__`\n',
        raw: `[block:html]
{
  "html": "<h1>Hoo ha</h1>"
}
[/block]`,
      },
      {
        key: '__MAGIC_BLOCK_1__',
        token: '\n`__MAGIC_BLOCK_1__`\n',
        raw: `[block:html]
{
  "html": "<b>second block</b>"
}
[/block]`,
      },
    ];

    const restored = restoreMagicBlocks(replaced, blocks);

    expect(restored).toBe(`# Title
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

  it('should restore magic blocks at start of document', () => {
    const replaced = `\`__MAGIC_BLOCK_0__\`
# Title
Some text.`;
    const blocks = [
      {
        key: '__MAGIC_BLOCK_0__',
        token: '\n`__MAGIC_BLOCK_0__`\n',
        raw: `[block:html]
{
  "html": "<h1>Hoo ha</h1>"
}
[/block]`,
      },
    ];

    const restored = restoreMagicBlocks(replaced, blocks);

    expect(restored).toBe(`[block:html]
{
  "html": "<h1>Hoo ha</h1>"
}
[/block]
# Title
Some text.`);
  });
});
