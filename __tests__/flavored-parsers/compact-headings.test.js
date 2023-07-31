import { mdast } from '../../index';

describe('Compact headings', () => {
  it('can parse compact headings', () => {
    const heading = '#Compact Heading';
    expect(mdast(heading)).toMatchSnapshot();
  });

  it('reports the offsets for compact headings correctly', () => {
    const heading = '#Compact Heading';
    const tree = mdast(heading, { settings: { position: true } });

    expect(tree.children[0].position.start.offset).toBe(0);
    expect(tree.children[0].position.end.offset).toBe(17);
  });

  it('can parse headings that are not compact', () => {
    const heading = '# Non-compact Heading';
    expect(mdast(heading)).toMatchSnapshot();
  });

  it('reports the offsets for non-compact headings correctly', () => {
    const heading = '# Non-compact Heading';
    const tree = mdast(heading, { settings: { position: true } });

    expect(tree.children[0].position.start.offset).toBe(0);
    expect(tree.children[0].position.end.offset).toBe(21);
  });

  it('can parse a compact heading followed by a setext heading', () => {
    const heading = `
##Non-compact Heading
---
`;
    const tree = mdast(heading);

    expect(tree.children[0].children[0].value).toBe('Non-compact Heading');
    expect(tree.children[1].type).toBe('thematicBreak');
  });
});
