import type { Root } from 'mdast';

import { mdast, mdx } from '../../index';

describe('callouts compiler', () => {
  it('compiles callouts', () => {
    const markdown = `> 🚧 It works!
>
> And, it no longer deletes your content!
`;

    expect(mdx(mdast(markdown))).toBe(markdown);
  });

  it('compiles callouts with no heading', () => {
    const markdown = `> 🚧
>
> And, it no longer deletes your content!
`;

    expect(mdx(mdast(markdown))).toBe(markdown);
  });

  it('compiles callouts with no heading or body', () => {
    const markdown = `> 🚧
`;

    expect(mdx(mdast(markdown))).toBe(markdown);
  });

  it('compiles callouts with no heading or body and no new line at the end', () => {
    const markdown = '> ℹ️';

    expect(mdx(mdast(markdown))).toBe(`${markdown}\n`);
  });

  it('compiles callouts with markdown in the heading', () => {
    const markdown = `> 🚧 It **works**!
>
> And, it no longer deletes your content!
`;

    expect(mdx(mdast(markdown))).toBe(markdown);
  });

  it('compiles callouts with paragraphs', () => {
    const markdown = `> 🚧 It **works**!
>
> And...
>
> it correctly compiles paragraphs. :grimace:
`;

    expect(mdx(mdast(markdown))).toBe(markdown);
  });

  it('compiles callouts with icons + theme', () => {
    const mockAst = {
      type: 'root',
      children: [
        {
          children: [
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  value: 'test',
                },
              ],
            },
          ],
          type: 'rdme-callout',
          data: {
            hName: 'Callout',
            hProperties: {
              icon: 'fad fa-wagon-covered',
              empty: false,
              theme: 'warn',
            },
          },
        },
      ],
    };
    const markdown = `
<Callout icon="fad fa-wagon-covered" theme="warn">
  test
</Callout>`.trim();

    expect(mdx(mockAst as Root).trim()).toBe(markdown);
  });

  it('compiles a callout with only a theme set', () => {
    const mockAst = {
      type: 'root',
      children: [
        {
          children: [
            {
              type: 'heading',
              depth: 3,
              children: [
                {
                  type: 'text',
                  value: 'test',
                },
              ],
            },
          ],
          type: 'rdme-callout',
          data: {
            hName: 'Callout',
            hProperties: {
              empty: false,
              theme: 'warn',
            },
          },
        },
      ],
    };
    const markdown = '> 🚧 test';

    expect(mdx(mockAst as Root).trim()).toBe(markdown);
  });

  it('compiles a callout with only an icon set', () => {
    const mockAst = {
      type: 'root',
      children: [
        {
          children: [
            {
              type: 'heading',
              depth: 3,
              children: [
                {
                  type: 'text',
                  value: 'test',
                },
              ],
            },
          ],
          type: 'rdme-callout',
          data: {
            hName: 'Callout',
            hProperties: {
              icon: '🚧',
              empty: false,
            },
          },
        },
      ],
    };
    const markdown = '> 🚧 test';

    expect(mdx(mockAst as Root).trim()).toBe(markdown);
  });
});
