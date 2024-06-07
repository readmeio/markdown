import { hast, hastFromHtml } from '../../lib';
import { h } from 'hastscript';

describe('hast transformer', () => {
  it('parses components into the tree', () => {
    const md = `
## Test

<Example />
    `;
    const components = {
      Example: "## It's coming from within the component!",
    };

    const expected = h(
      undefined,
      h('h2', undefined, 'Test'),
      '\n',
      h('h2', undefined, "It's coming from within the component!"),
    );

    expect(hast(md, { components })).toStrictEqualExceptPosition(expected);
  });
});

describe('hastFromHtml', () => {
  it('parses html', () => {
    const html = '<div><span>Nice</span></div>';
    const tree = hastFromHtml(html);

    // @ts-ignore
    expect(tree.children[0].tagName).toBe('html');
    // @ts-ignore
    expect(tree.children[0].children[1].children[0].tagName).toBe('div');
    // @ts-ignore
    expect(tree.children[0].children[1].children[0].children[0].tagName).toBe('span');
  });
});
