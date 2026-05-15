import { afterEach, vi } from 'vitest';

import * as RDMD from '../../lib';

const { translateMagicBlocks } = RDMD;

function imageBlock(image: Record<string, unknown>) {
  return `[block:image]\n${JSON.stringify({ images: [image] }, null, 2)}\n[/block]`;
}

function lineCount(content: string) {
  return content.split('\n').length;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('translateMagicBlocks', () => {
  it('translates uncaptioned image magic blocks into Image JSX', () => {
    const input = imageBlock({
      align: 'center',
      border: true,
      image: ['https://example.com/image.png', 'Example title', 'Example alt text'],
      sizing: 'full',
    });

    const output = translateMagicBlocks(input);

    expect(output).toContain(
      '<Image align="center" alt="Example alt text" border={true} title="Example title" width="100%" src="https://example.com/image.png" />',
    );
    expect(lineCount(output)).toBe(lineCount(input));
  });

  it('translates captioned image magic blocks without losing the caption', () => {
    const input = imageBlock({
      align: 'left',
      caption: 'Readable caption',
      image: ['https://example.com/captioned.png', '', 'Captioned alt'],
    });

    const output = translateMagicBlocks(input);

    expect(output).toContain(
      '<Image align="left" alt="Captioned alt" caption="Readable caption" src="https://example.com/captioned.png" />',
    );
    expect(lineCount(output)).toBe(lineCount(input));
  });

  it('falls back to the caption when image alt text is missing', () => {
    const input = imageBlock({
      caption: 'Caption text',
      image: ['https://example.com/caption-fallback.png', '', null],
    });

    const output = translateMagicBlocks(input);

    expect(output).toContain(
      '<Image alt="Caption text" caption="Caption text" src="https://example.com/caption-fallback.png" />',
    );
    expect(lineCount(output)).toBe(lineCount(input));
  });

  it('preserves empty alt text when no caption fallback exists', () => {
    const input = imageBlock({
      caption: '',
      image: ['https://example.com/missing-alt.png', '', ''],
    });

    const output = translateMagicBlocks(input);

    expect(output).toContain('<Image alt="" src="https://example.com/missing-alt.png" />');
    expect(lineCount(output)).toBe(lineCount(input));
  });

  it('keeps surrounding markdown byte-for-byte intact', () => {
    const block = imageBlock({
      image: ['https://example.com/image.png', '', 'Example alt text'],
    });
    const prefix = '# Title\n\n- keep   spacing *exactly*\n\n';
    const suffix = '\n\n{user.name}\n<<project.name>>';
    const input = `${prefix}${block}${suffix}`;

    const output = translateMagicBlocks(input);

    expect(output.startsWith(prefix)).toBe(true);
    expect(output.endsWith(suffix)).toBe(true);
    expect(lineCount(output)).toBe(lineCount(input));
  });

  it('uses the first image tuple in the magic block', () => {
    const input = `[block:image]\n${JSON.stringify(
      {
        images: [
          { caption: 'no tuple here' },
          { image: ['https://example.com/second.png', '', 'Second alt'] },
          { image: ['https://example.com/third.png', '', 'Third alt'] },
        ],
      },
      null,
      2,
    )}\n[/block]`;

    const output = translateMagicBlocks(input);

    expect(output).toContain('src="https://example.com/second.png"');
    expect(output).toContain('alt="Second alt"');
    expect(output).not.toContain('third.png');
    expect(lineCount(output)).toBe(lineCount(input));
  });

  it('escapes JSX-ambiguous attribute values with expression attributes', () => {
    const input = imageBlock({
      caption: 'Caption with "quotes" and {braces}',
      image: ['https://example.com/unsafe.png', '', 'Alt with "quotes", <tags>, and {braces}'],
    });

    const output = translateMagicBlocks(input);

    expect(output).toContain('alt={"Alt with \\"quotes\\", <tags>, and {braces}"}');
    expect(output).toContain('caption={"Caption with \\"quotes\\" and {braces}"}');
    expect(lineCount(output)).toBe(lineCount(input));
  });

  it('leaves malformed image magic blocks unchanged', () => {
    const input = '[block:image]\n{not json}\n[/block]';

    expect(translateMagicBlocks(input)).toBe(input);
  });

  it('leaves unsupported magic block types unchanged', () => {
    const input = '[block:callout]\n{\n  "type": "info",\n  "body": "Keep me raw"\n}\n[/block]';

    expect(translateMagicBlocks(input)).toBe(input);
  });

  it('does not call the full mdxish renderer', () => {
    const mdxishSpy = vi.spyOn(RDMD, 'mdxish');
    const input = ['Intro', imageBlock({ image: ['https://example.com/image.png', '', 'Alt'] }), 'Outro'].join('\n');

    translateMagicBlocks(input);

    expect(mdxishSpy).not.toHaveBeenCalled();
  });
});
