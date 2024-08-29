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
      "<Image align="center" width="300px" src="https://drastik.ch/wp-content/uploads/2023/06/blackcat.gif" alt="" title="">
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
    configure({ defaultIgnore: undefined });
    const inspect = (node?: HTMLElement, min = false) => {
      const filterNode = (node: Node) => true;
      console.log(prettyDOM(node, undefined, { filterNode, min }));
    };
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

    it('should not execute <script> tags ever', async () => {
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
});
