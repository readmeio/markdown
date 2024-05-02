import { hast, mdx, mdast } from '../../index';

describe('tableCellInlineCode', () => {
  it.skip('unescapes escaped pipe chars inside inline code within table headers', () => {
    const doc = `
| \`one \\| two \\| three \\| four\` | two |
| :- | :- |
`;

    const tree = hast(doc);
    expect(tree).toMatchSnapshot();
  });

  it.skip('unescapes escaped pipe chars inside inline code within table cells', () => {
    const doc = `
|    |    |
| :- | :- |
| \`one \\| two \\| three \\| four\` | two |
`;

    const tree = hast(doc);
    expect(tree).toMatchSnapshot();
  });

  it.skip('preserves escaped pipe chars inside text table cells', () => {
    const doc = `
| these \\| stay \\| escaped \\| inside \\| a single cell | |
| :- | :- |
`;

    const tree = hast(doc);
    expect(tree).toMatchSnapshot();
  });

  it.skip('splits table cells when inline code contains "unescaped" pipe chars', () => {
    const doc = `
| \`this | splits | up | to | more | cells\` | two |
| :- | :- |
`;

    const tree = hast(doc);
    expect(tree).toMatchSnapshot();
  });

  it.skip('preserves the escaped pipe character when re-serializing from mdast', () => {
    const doc = `
| \`one \\| two \\| three \\| four\` | two |
| :- | :- |
`;

    const tree = mdast(doc);
    expect(mdx(tree)).toMatchInlineSnapshot(`
      "| \`one \\| two \\| three \\| four\` | two |
      | :- | :- |
      "
    `);
  });
});
