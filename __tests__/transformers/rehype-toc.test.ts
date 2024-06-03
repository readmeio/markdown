import { compile } from '../../index';
import { h } from 'hastscript';

describe('rehype-toc transformer', () => {
  it('parses out a toc with max depth of 2', () => {
    const md = `
# Title

## Subheading

### Third

## Second Subheading
`;
    const module = compile(md);
    // @ts-expect-error
    const { ast } = module.data.toc;

    const expected = h('ul', undefined, [
      h('li', undefined, h('p', undefined, h('a', { href: '#title' }, 'Title'))),
      h(
        'li',
        undefined,
        h(
          'ul',
          undefined,
          h('li', undefined, h('p', undefined, h('a', { href: '#subheading' }, 'Subheading'))),
          h('li', undefined, h('p', undefined, h('a', { href: '#second-subheading' }, 'Second Subheading'))),
        ),
      ),
    ]);

    // @ts-expect-error
    expect(ast).toStrictEqualExceptPosition(expected);
  });

  it('compiles the toc into a vfile', () => {
    const md = `
# Title

## Subheading

### Third

## Second Subheading
`;
    const module = compile(md);
    // @ts-expect-error
    const { vfile } = module.data.toc;

    // @ts-ignore
    expect(vfile.value).toMatch(/use strict/);
  });

  it('parses a toc from components', () => {
    const md = `
# Title

<CommonInfo />

## Subheading
`;
    const components = {
      CommonInfo: compile('## Common Heading'),
    };
    const module = compile(md, { components });
    // @ts-expect-error
    const { ast } = module.data.toc;

    const expected = h('ul', undefined, [
      h('li', undefined, h('p', undefined, h('a', { href: '#title' }, 'Title'))),
      h(
        'li',
        undefined,
        h(
          'ul',
          undefined,
          h('li', undefined, h('p', undefined, h('a', { href: '#common-heading' }, 'Common Heading'))),
          h('li', undefined, h('p', undefined, h('a', { href: '#subheading' }, 'Subheading'))),
        ),
      ),
    ]);

    // @ts-expect-error
    expect(ast).toStrictEqualExceptPosition(expected);
  });
});
