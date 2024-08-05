import { astToPlainText, hast } from '../../index';

describe.skip('astToPlainText with tables', () => {
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

    expect(astToPlainText(hast(text))).toMatchInlineSnapshot('"Col. A Col.  B Cell  A1 Cell B1 Cell  A2 Cell  B2"');
  });
});
