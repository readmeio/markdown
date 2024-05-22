import { mdx } from '../../index';

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

  it('compiles reusable-content nodes', () => {
    const ast = {
      type: 'reusable-content',
      tag: 'Parliament',
    };

    expect(mdx(ast).trim()).toBe('<Parliament />');
  });
});
