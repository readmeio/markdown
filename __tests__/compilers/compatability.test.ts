import { mdx } from '../../index';
import * as rdmd from '@readme/markdown';

describe('compatability with RDMD', () => {
  it('compiles variable nodes', () => {
    const ast = {
      type: 'readme-variable',
      text: 'parliament',
      data: {
        hName: 'readme-variable',
        hProperties: {
          variable: 'parliament',
        },
      },
    };

    expect(mdx(ast).trim()).toBe('<Variable name="parliament" />');
  });

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

  it('compiles html comments to JSX comments on more complex lines', () => {
    const md = `
  8. Add the test account's credentials under a heading of your choice in your \`.edgerc\`. (For the moment, please ping Sheila for this step.) <!-- move this lower -->
`;

    expect(mdx(rdmd.mdast(md)).trim()).toBe('This is some in progress {/* commented out stuff */}');
  });
});
