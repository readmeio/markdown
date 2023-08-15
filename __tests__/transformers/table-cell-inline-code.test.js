import { hast, md, mdast } from '../../index';

describe('tableCellInlineCode', () => {
  it('unescapes escaped pipe chars inside inline code within table headers', () => {
    const doc = `
| \`one \\| two \\| three \\| four\` | two |
| :- | :- |
`;

    const tree = hast(doc);
    expect(tree).toMatchSnapshot();
  });

  it('unescapes escaped pipe chars inside inline code within table cells', () => {
    const doc = `
|    |    |
| :- | :- |
| \`one \\| two \\| three \\| four\` | two |
`;

    const tree = hast(doc);
    expect(tree).toMatchSnapshot();
  });

  it('preserves escaped pipe chars inside text table cells', () => {
    const doc = `
| these \\| stay \\| escaped \\| inside \\| a single cell | |
| :- | :- |
`;

    const tree = hast(doc);
    expect(tree).toMatchSnapshot();
  });

  it('splits table cells when inline code contains "unescaped" pipe chars', () => {
    const doc = `
| \`this | splits | up | to | more | cells\` | two |
| :- | :- |
`;

    const tree = hast(doc);
    expect(tree).toMatchSnapshot();
  });

  it('preserves the escaped pipe character when re-serializing from mdast', () => {
    const doc = `
| \`one \\| two \\| three \\| four\` | two |
| :- | :- |
`;

    const tree = mdast(doc);
    expect(md(tree)).toMatchInlineSnapshot(`
      "| \`one \\\\| two \\\\| three \\\\| four\` | two |
      | :---------------------------- | :-- |
      "
    `);
  });
});
