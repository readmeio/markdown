import * as rmdx from '../../index';

describe('variable compiler', () => {
  it('compiles back to the original mdx', () => {
    const mdx = `
## Hello!

{user.name}

### Bye bye!
    `;
    const tree = rmdx.mdast(mdx);

    expect(rmdx.mdx(tree).trim()).toStrictEqual(mdx.trim());
  });

  it('with spaces in a variable, it compiles back to the original', () => {
    const mdx = `{user["oh no"]}`;
    const tree = rmdx.mdast(mdx);

    expect(rmdx.mdx(tree).trim()).toStrictEqual(mdx.trim());
  });
});
