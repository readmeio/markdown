import { mdast } from '../../index';

describe('Readme Components Transformer', () => {
  const nodes = [
    { md: '<Table />', type: 'table' },
    { md: '<Image />', type: 'image' },
    { md: '<CodeTabs />', type: 'code-tabs' },
  ];

  it.each(nodes)('transformss $md into a(n) $type node', ({ md, type }) => {
    const tree = mdast(md);

    expect(tree.children[0].type).toBe(type);
  });
});
