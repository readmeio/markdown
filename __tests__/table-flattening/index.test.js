const { astToPlainText, hast } = require('../../index');

describe('astToPlainText with tables', () => {
  it('includes all cells', () => {
    const text = `
  | Col. A  | Col. B  | Col. C  |
  |:-------:|:-------:|:-------:|
  | Cell A1 | Cell B1 | Cell C1 |
  | Cell A2 | Cell B2 | Cell C2 |
  | Cell A3 | Cell B3 | Cell C3 |`;

    expect(astToPlainText(hast(text))).toMatchInlineSnapshot(
      '"Col. A Col. B Col. C Cell A1 Cell B1 Cell C1 Cell A2 Cell B2 Cell C2 Cell A3 Cell B3 Cell C3"',
    );
  });

  it('includes formatted text', () => {
    const text = `
| *Col. A*  | Col. *B*  |
|:---------:|:---------:|
| Cell *A1* | *Cell B1* |
| *Cell* A2 | *Cell* B2 |`;

    expect(astToPlainText(hast(text))).toMatchInlineSnapshot('"Col. A Col. B Cell A1 Cell B1 Cell A2 Cell B2"');
  });
});

describe('hast(table)', () => {
  it('should populate value on the tables children', () => {
    const text = `
<table>
  <caption>
    Test table
  </caption>
  <thead>
    <tr>
      <th scope="col">Col A</th>
      <th scope="col">Col B</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Donuts</th>
      <td>3,000</td>
    </tr>
    <tr>
      <th scope="row">Stationery</th>
      <td>18,000</td>
    </tr>
  </tbody>
</table>
      `;
    const ast = hast(text);
    const table = ast.children[0];

    expect(table.children.map(child => child.value)).toMatchInlineSnapshot(`
      Array [
        "",
        "Test table",
        "",
        "Col A Col B",
        "",
        "Donuts 3,000 Stationery 18,000",
        "",
      ]
    `);
  });
});
