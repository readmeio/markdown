import { mdx } from '../../index';
import * as rdmd from '@readme/markdown-legacy';

describe('compatability with RDMD', () => {
  it('compiles glossary nodes', () => {
    const ast = {
      type: 'readme-glossary-item',
      data: {
        hProperties: {
          term: 'parliament',
        },
      },
    };

    expect(mdx(ast).trim()).toBe('<Glossary>parliament</Glossary>');
  });

  it('compiles mdx glossary nodes', () => {
    const ast = {
      type: 'readme-glossary-item',
      data: {
        hName: 'Glossary',
      },
      children: [{ type: 'text', value: 'parliament' }],
    };

    expect(mdx(ast).trim()).toBe('<Glossary>parliament</Glossary>');
  });

  it('compiles mdx image nodes', () => {
    const ast = {
      type: 'figure',
      data: {
        hName: 'figure',
      },
      children: [
        {
          align: 'center',
          width: '300px',
          src: 'https://drastik.ch/wp-content/uploads/2023/06/blackcat.gif',
          url: 'https://drastik.ch/wp-content/uploads/2023/06/blackcat.gif',
          alt: '',
          title: '',
          type: 'image',
          data: {
            hProperties: {
              align: 'center',
              className: 'border',
              width: '300px',
            },
          },
        },
        {
          type: 'figcaption',
          data: {
            hName: 'figcaption',
          },
          children: [
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  value: 'hello ',
                },
                {
                  type: 'strong',
                  children: [
                    {
                      type: 'text',
                      value: 'cat',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    expect(mdx(ast).trim()).toBe(
      '<Image align="center" border="true" caption="hello **cat**" width="300px" src="https://drastik.ch/wp-content/uploads/2023/06/blackcat.gif" />',
    );
  });

  it('compiles mdx embed nodes', () => {
    const ast = {
      data: {
        hProperties: {
          html: false,
          url: 'https://cdn.shopify.com/s/files/1/0711/5132/1403/files/BRK0502-034178M.pdf',
          title: 'iframe',
          href: 'https://cdn.shopify.com/s/files/1/0711/5132/1403/files/BRK0502-034178M.pdf',
          typeOfEmbed: 'iframe',
          height: '300px',
          width: '100%',
          iframe: true,
        },
        hName: 'embed',
        html: false,
        url: 'https://cdn.shopify.com/s/files/1/0711/5132/1403/files/BRK0502-034178M.pdf',
        title: 'iframe',
        href: 'https://cdn.shopify.com/s/files/1/0711/5132/1403/files/BRK0502-034178M.pdf',
        typeOfEmbed: 'iframe',
        height: '300px',
        width: '100%',
        iframe: true,
      },
      type: 'embed',
    };

    expect(mdx(ast).trim()).toBe('<Embed html="false" url="https://cdn.shopify.com/s/files/1/0711/5132/1403/files/BRK0502-034178M.pdf" title="iframe" href="https://cdn.shopify.com/s/files/1/0711/5132/1403/files/BRK0502-034178M.pdf" typeOfEmbed="iframe" height="300px" width="100%" iframe="true" />');
  });

  it('compiles reusable-content nodes', () => {
    const ast = {
      type: 'reusable-content',
      tag: 'Parliament',
    };

    expect(mdx(ast).trim()).toBe('<Parliament />');
  });

  it('compiles html comments to JSX comments', () => {
    const md = `
This is some in progress <!-- commented out stuff -->
`;

    expect(mdx(rdmd.mdast(md)).trim()).toBe('This is some in progress {/* commented out stuff */}');
  });

  it('compiles multi-line html comments to JSX comments', () => {
    const md = `
## Wip

<!--

### Some stuff I was working on

-->
`;

    expect(mdx(rdmd.mdast(md)).trim()).toMatchInlineSnapshot(`
      "## Wip

      {/*

      ### Some stuff I was working on

      */}"
    `);
  });

  it('closes un-closed self closing tags', () => {
    const md = `
This is a break: <br>
`;

    expect(mdx(rdmd.mdast(md)).trim()).toBe('This is a break: <br />');
  });

  it('closes un-closed self closing tags with a space', () => {
    const md = `
This is a break: <br >
`;

    expect(mdx(rdmd.mdast(md)).trim()).toBe('This is a break: <br />');
  });

  it('closes complex un-closed self closing tags', () => {
    const md = `
This is an image: <img src="http://example.com/#\\>" >
`;

    expect(mdx(rdmd.mdast(md)).trim()).toBe('This is an image: <img src="http://example.com/#\\>" />');
  });

  it('compiles escapes', () => {
    const md = `
\\- not a list item
    `;

    expect(mdx(rdmd.mdast(md)).trim()).toBe('\\- not a list item');
  });

  it('compiles escapes of backslashes', () => {
    const md = `
\\\\**still emphatic**
    `;

    expect(mdx(rdmd.mdast(md)).trim()).toBe('\\\\**still emphatic**');
  });
});
