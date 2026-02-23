
import { mdast } from '../../../lib';

describe('convert anchor tag', () => {
    it('converts anchor tag to link node', () => {
    const mdx = `
<Anchor href="https://readme.com">ReadMe</Anchor>
    `;

    expect(mdast(mdx)).toMatchSnapshot();
  });
})
