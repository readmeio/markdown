import React from 'react';
import fs from 'node:fs';
import { vi } from 'vitest';
import { render, screen, prettyDOM, configure } from '@testing-library/react';

import { mdx, compile, run } from '../../index';
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
      type: 'root',
      children: [
        {
          type: 'figure',
          data: { hName: 'figure' },
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
              data: { hName: 'figcaption' },
              children: [
                {
                  type: 'paragraph',
                  children: [
                    { type: 'text', value: 'hello ' },
                    { type: 'strong', children: [{ type: 'text', value: 'cat' }] },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    expect(mdx(ast).trim()).toMatchInlineSnapshot(`
      "<Image align="center" width="300px" src="https://drastik.ch/wp-content/uploads/2023/06/blackcat.gif" border={true}>
        hello **cat**
      </Image>"
    `);
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

    expect(mdx(ast).trim()).toBe(
      '<Embed url="https://cdn.shopify.com/s/files/1/0711/5132/1403/files/BRK0502-034178M.pdf" title="iframe" href="https://cdn.shopify.com/s/files/1/0711/5132/1403/files/BRK0502-034178M.pdf" typeOfEmbed="iframe" height="300px" width="100%" iframe="true" />',
    );
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

  it('compiles magic block images into blocks', () => {
    const imageMd = fs.readFileSync('__tests__/fixtures/image-block-no-attrs.md', { encoding: 'utf8' });
    const imageMdx = fs.readFileSync('__tests__/fixtures/image-block-no-attrs.mdx', { encoding: 'utf8' });

    expect(mdx(rdmd.mdast(imageMd))).toBe(imageMdx);
  });

  it('compiles user variables', () => {
    const md = `Contact me at <<email>>`;

    expect(mdx(rdmd.mdast(md))).toBe(`Contact me at {user.email}\n`);
  });

  describe('<HTMLBlock> wrapping', () => {
    const rawStyle = `<style data-testid="style-tag">
    p {
      color: red;
    }
    </style>
    `;
    const rawScript = `<script data-testid="script-tag">
    console.log('hello raw')
    </script>
    `;
    const magicScript = `[block:html]
    {
      "html": "<script data-testid='script-block'>console.log('hello magic')</script>"
    }
    [/block]
    `;

    it('should wrap raw <style> tags in an <HTMLBlock>', async () => {
      const legacyAST = rdmd.mdast(rawStyle);
      const converted = mdx(legacyAST);
      const compiled = compile(converted);
      const Component = (await run(compiled)).default;
      render(
        <div className="markdown-body">
          <Component />
        </div>,
      );
      expect(screen.getByTestId('style-tag').tagName).toMatch('STYLE');
    });

    it('should wrap raw <script> tags in an <HTMLBlock>', async () => {
      const legacyAST = rdmd.mdast(rawScript);
      const converted = mdx(legacyAST);
      const compiled = compile(converted);
      const Component = (await run(compiled)).default;
      render(
        <div className="markdown-body">
          <Component />
        </div>,
      );
      expect(screen.queryByTestId('script-tag')).toBe(null);
    });

    it('should never execute <script> tags', async () => {
      /**
       * @note compatability mode has been deprecated for RMDX
       */
      const spy = vi.spyOn(console, 'log');
      const legacyAST = rdmd.mdast(magicScript);
      const converted = mdx(legacyAST);
      const compiled = compile(converted);
      const Component = await run(compiled);
      render(
        <div className="markdown-body">
          <Component.default />
        </div>,
      );
      expect(spy).toHaveBeenCalledTimes(0);
    });
  });

  it('can parse and transform magic image block AST to MDX', () => {
    const md = `
[block:image]
{
  "images": [
    {
      "image": [
        "https://files.readme.io/4a1c7a0-Iphone.jpeg",
        null,
        ""
      ],
      "align": "center",
      "sizing": "250px"
    }
  ]
}
[/block]
`;

    const rmdx = mdx(rdmd.mdast(md));

    expect(rmdx).toMatch('<Image align="center" width="250px" src="https://files.readme.io/4a1c7a0-Iphone.jpeg" />');
  });

  it('can parse and transform magic image block AST to MDX with caption', () => {
    const md = `
[block:image]
{
  "images": [
    {
      "image": [
        "https://files.readme.io/fd21f977cfbb9f55b3a13ab0b827525e94ee1576f21bbe82945cdc22cc966d82-Screenshot_2024-09-12_at_3.47.05_PM.png",
        "",
        "Data Plane Setup"
      ],
      "align": "center",
      "caption": "Data Plane Setup",
      "border": true
    }
  ]
}
[/block]`;

    const rmdx = mdx(rdmd.mdast(md));
    expect(rmdx).toMatchInlineSnapshot(
      `
      "<Image alt="Data Plane Setup" align="center" border={true} src="https://files.readme.io/fd21f977cfbb9f55b3a13ab0b827525e94ee1576f21bbe82945cdc22cc966d82-Screenshot_2024-09-12_at_3.47.05_PM.png">
        Data Plane Setup
      </Image>
      "
    `,
    );
  });

  it('trims whitespace surrounding phrasing content (emphasis, strong, etc)', () => {
    const md = `** bold ** and _ italic _ and ***   bold italic ***`;

    const rmdx = mdx(rdmd.mdast(md));
    expect(rmdx).toMatchInlineSnapshot(`
      "**bold** and *italic* and ***bold italic***
      "
    `);
  });

  it('moves whitespace surrounding phrasing content (emphasis, strong, etc) to the appropriate place', () => {
    const md = `**bold **and also_ italic_ and*** bold italic***aaaaaah`;

    const rmdx = mdx(rdmd.mdast(md));
    expect(rmdx).toMatchInlineSnapshot(`
      "**bold** and also *italic* and ***bold italic***aaaaaah
      "
    `);
  });

  it('correctly parses and transforms image magic block with legacy data', () => {
    const md = `
[block:image]
{
  "images": [
    {
      "image": [
        "https://files.readme.io/9ac3bf4-SAP_Folders_Note.png",
        "SAP Folders Note.png",
        806,
        190,
        "#e8e9ea"
      ]
    }
  ]
}
[/block]
## Tile View
    `;

    const tree = rdmd.mdast(md);
    const rmdx = mdx(tree);
    expect(rmdx).toMatchInlineSnapshot(`
      "![806](https://files.readme.io/9ac3bf4-SAP_Folders_Note.png "SAP Folders Note.png")

      ## Tile View
      "
    `);
  });

  it('compiles parameter magic blocks with breaks to jsx', () => {
    const md = `
[block:parameters]
${JSON.stringify(
  {
    data: {
      'h-0': 'Term',
      'h-1': 'Definition',
      '0-0': 'Events',
      '0-1': 'Pseudo-list:  \n● One  \n● Two',
    },
    cols: 2,
    rows: 1,
    align: ['left', 'left'],
  },
  null,
  2,
)}
[/block]
`;

    const rmdx = mdx(rdmd.mdast(md));
    expect(rmdx).toMatchInlineSnapshot(`
      "<Table align={["left","left"]}>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>
              Term
            </th>

            <th style={{ textAlign: "left" }}>
              Definition
            </th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td style={{ textAlign: "left" }}>
              Events
            </td>

            <td style={{ textAlign: "left" }}>
              Pseudo-list:




              ● One




              ● Two
            </td>
          </tr>
        </tbody>
      </Table>
      "
    `);
  });

  it('compiles callouts without a title', () => {
    const md = `
> 🥈
>
> Lorem ipsum dolor sit amet consectetur adipisicing elit. Error eos animi obcaecati quod repudiandae aliquid nemo veritatis ex, quos delectus minus sit omnis vel dolores libero, recusandae ea dignissimos iure?
`;

    const rmdx = mdx(rdmd.mdast(md));
    expect(rmdx).toMatchInlineSnapshot(`
      "> 🥈
      >
      > Lorem ipsum dolor sit amet consectetur adipisicing elit. Error eos animi obcaecati quod repudiandae aliquid nemo veritatis ex, quos delectus minus sit omnis vel dolores libero, recusandae ea dignissimos iure?
      "
    `);
  });

  it('compiles tables with inline code with newlines', () => {
    const md = `
[block:parameters]
${JSON.stringify(
  {
    data: {
      'h-0': 'Field',
      'h-1': 'Description',
      '0-0': 'orderby',
      '0-1': '`{\n "field": "ID",\n "type": "ASC"\n }`',
    },
    cols: 2,
    rows: 1,
    align: ['left', 'left'],
  },
  null,
  2,
)}
[/block]
    `;

    const rmdx = mdx(rdmd.mdast(md));
    expect(rmdx).toMatchInlineSnapshot(`
      "<Table align={["left","left"]}>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>
              Field
            </th>

            <th style={{ textAlign: "left" }}>
              Description
            </th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td style={{ textAlign: "left" }}>
              orderby
            </td>

            <td style={{ textAlign: "left" }}>
              \`{
               "field": "ID",
               "type": "ASC"
               }\`
            </td>
          </tr>
        </tbody>
      </Table>
      "
    `);
  });
});
