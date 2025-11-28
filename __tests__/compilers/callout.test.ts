import type { Element } from 'hast';
import type { Root } from 'mdast';

import { mdast, mdx, mdxish } from '../../index';

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

describe('mdxish callout compiler', () => {
  it('compiles callouts', () => {
    const markdown = `> 🚧 It works!
>
> And, it no longer deletes your content!
`;

    const hast = mdxish(markdown);
    const callout = hast.children[0] as Element;

    expect(callout.tagName).toBe('Callout');
    expect(callout.properties?.icon).toBe('🚧');
    expect(callout.properties?.theme).toBe('warn');
    expect(callout.children).toHaveLength(2); // h3 and p
  });

  it('compiles callouts with no heading', () => {
    const markdown = `> 🚧
>
> And, it no longer deletes your content!
`;

    const hast = mdxish(markdown);
    const callout = hast.children[0] as Element;

    expect(callout.tagName).toBe('Callout');
    expect(callout.properties?.icon).toBe('🚧');
    expect(callout.properties?.empty).toBe('');
    expect(callout.properties?.theme).toBe('warn');
  });

  it('compiles callouts with no heading or body', () => {
    const markdown = `> 🚧
`;

    const hast = mdxish(markdown);
    const callout = hast.children[0] as Element;

    expect(callout.tagName).toBe('Callout');
    expect(callout.properties?.icon).toBe('🚧');
    expect(callout.properties?.empty).toBe('');
    expect(callout.properties?.theme).toBe('warn');
  });

  it('compiles callouts with no heading or body and no new line at the end', () => {
    const markdown = '> ℹ️';

    const hast = mdxish(markdown);
    const callout = hast.children[0] as Element;

    expect(callout.tagName).toBe('Callout');
    expect(callout.properties?.icon).toBe('ℹ️');
    expect(callout.properties?.empty).toBe('');
    expect(callout.properties?.theme).toBe('info');
  });

  it('compiles callouts with markdown in the heading', () => {
    const markdown = `> 🚧 It **works**!
>
> And, it no longer deletes your content!
`;

    const hast = mdxish(markdown);
    const callout = hast.children[0] as Element;

    expect(callout.tagName).toBe('Callout');
    expect(callout.properties?.icon).toBe('🚧');
    expect(callout.properties?.theme).toBe('warn');

    const heading = callout.children[0] as Element;
    expect(heading.tagName).toBe('h3');
    expect(heading.properties?.id).toBe('it-works');
  });

  it('compiles callouts with paragraphs', () => {
    const markdown = `> 🚧 It **works**!
>
> And...
>
> it correctly compiles paragraphs. :grimace:
`;

    const hast = mdxish(markdown);
    const callout = hast.children[0] as Element;

    expect(callout.tagName).toBe('Callout');
    expect(callout.properties?.icon).toBe('🚧');
    expect(callout.properties?.theme).toBe('warn');
    expect(callout.children.length).toBeGreaterThan(1); // heading + multiple paragraphs
  });

  it('compiles callouts with icons + theme', () => {
    const markdown = `
<Callout icon="fad fa-wagon-covered" theme="warn">
  test
</Callout>`.trim();

    const hast = mdxish(markdown);
    const callout = hast.children[0] as Element;

    expect(callout.tagName).toBe('Callout');
    expect(callout.properties?.icon).toBe('fad fa-wagon-covered');
    expect(callout.properties?.theme).toBe('warn');
  });

  it('compiles a callout with only a theme set', () => {
    const markdown = '> 🚧 test';

    const hast = mdxish(markdown);
    const callout = hast.children[0] as Element;

    expect(callout.tagName).toBe('Callout');
    expect(callout.properties?.icon).toBe('🚧');
    expect(callout.properties?.theme).toBe('warn');

    const heading = callout.children[0] as Element;
    expect(heading.tagName).toBe('h3');
  });

  it('compiles a callout with only an icon set', () => {
    const markdown = '> 🚧 test';

    const hast = mdxish(markdown);
    const callout = hast.children[0] as Element;

    expect(callout.tagName).toBe('Callout');
    expect(callout.properties?.icon).toBe('🚧');
    expect(callout.properties?.theme).toBe('warn'); // defaults based on icon
  });
});
