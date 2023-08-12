import { mdast } from '../../index';

describe('tableCellInlineCode', () => {
  it('unescapes escaped pipe chars inside inline code within table cells', () => {
    const md = `
| \`one \\| two \\| three \\| four\` | two |
| :- | :- |
`;

    const tree = mdast(md);
    expect(tree).toMatchSnapshot();
  });

  it('preserves escaped pipe chars inside text table cells', () => {
    const md = `
| these \\| stay \\| escaped \\| inside \\| a single cell | |
| :- | :- |
`;

    const tree = mdast(md);
    expect(tree).toMatchSnapshot();
  });

  it('splits table cells when inline code contains "unescaped" pipe chars', () => {
    const md = `
| \`this | splits | up | to | more | cells\` | two |
| :- | :- |
`;

    const tree = mdast(md);
    expect(tree).toMatchSnapshot();
  });
});
