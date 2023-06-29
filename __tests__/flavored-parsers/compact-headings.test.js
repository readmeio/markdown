import { mdast } from '../../index';

describe('Compact headings', () => {
  it('can parse compact headings', () => {
    const heading = '#Compact Heading';
    expect(mdast(heading, { settings: { position: true } })).toMatchSnapshot();
  });

  it('can parse headings that are not compact', () => {
    const heading = '# Non-compact Heading';
    expect(mdast(heading, { settings: { position: true } })).toMatchSnapshot();
  });
});
