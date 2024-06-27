import { mdast } from '../../lib';

describe('mdast transformer', () => {
  it('parses variables into the tree', () => {
    const md = `
Hello, {user.name}
    `;

    const ast = mdast(md);
    expect(ast.children[0].children[1].type).toBe('readme-variable');
    expect(ast.children[0].children[1].value).toBe('{user.name}');
  });
});
