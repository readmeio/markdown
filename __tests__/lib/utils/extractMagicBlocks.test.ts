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
    `;
    const { replaced, blocks } = extractMagicBlocks(input);
    expect(replaced).not.toContain('[block:html]');
    expect(replaced).toContain(blocks[0].token);
    expect(blocks).toHaveLength(1);
  });
});

describe('restoreMagicBlocks', () => {
  it('should restore magic blocks in markdown', () => {
    const output = `
      # Title
      Paragraph text.
      \`__MAGIC_BLOCK_0__\`
      More text.
    `;
    const blocks = [
      {
        token: '__MAGIC_BLOCK_0__',
        raw: `
          [block:html]
          {
            "html": "<h1>Hoo ha</h1>"
          }
          [/block]
        `,
      },
    ];
    const restored = restoreMagicBlocks(output, blocks);
    expect(restored).toContain('[block:html]');
    expect(restored).not.toContain(blocks[0].token);
  });
});
