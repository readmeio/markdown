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
});
