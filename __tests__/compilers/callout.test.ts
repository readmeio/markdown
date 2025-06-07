import type { Root } from 'mdast';

import { mdast, mdx } from '../../index';

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
              position: {
                start: {
                  line: 2,
                  column: 3,
                  offset: 53
                },
                end: {
                  line: 2,
                  column: 7,
                  offset: 57
                }
              }
            }
          ],
          position: {
            start: {
              line: 2,
              column: 3,
              offset: 53
            },
            end: {
              line: 2,
              column: 7,
              offset: 57
            }
          }
        }
      ],
      type: 'rdme-callout',
      data: {
        hName: 'Callout',
        hProperties: {
          icon: 'fad fa-wagon-covered',
          empty: false,
          theme: 'warn'
        }
      },
      position: {
        start: {
          line: 1,
          column: 1,
          offset: 0
        },
        end: {
          line: 3,
          column: 11,
          offset: 68
        }
      }
    }
  ],
  position: {
    start: {
      line: 1,
      column: 1,
      offset: 0
    },
    end: {
      line: 3,
      column: 11,
      offset: 68
    }
  }
};

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

  it('compiles callouts with no heading or body!?', () => {
    const markdown = `> 🚧
`;

    expect(mdx(mdast(markdown))).toBe(markdown);
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
    const markdown = `<Callout icon="fad fa-wagon-covered" theme="warn">
  test
</Callout>`;

    expect(mdx(mockAst as Root).trim()).toBe(markdown);
  });
});
