import * as rmdx from '../../index';

describe('variable compiler', () => {
  it('compiles back to the ', () => {
    const mdx = `
## Hello!

{user.name}

### Bye bye!
    `;
    const tree = rmdx.mdast(mdx);

    expect(rmdx.mdx(tree).trim()).toStrictEqual(mdx.trim());
  });
});
