import { removePosition } from 'unist-util-remove-position';

import { mdast } from '../../index';

describe('table parser', () => {
  describe('unescaping pipes', () => {
    it('parses tables with pipes in inline code', () => {
      const doc = `
|              |    |
| :----------- | :- |
| \`foo \\| bar\` |    |
`;
      const ast = mdast(doc);
      removePosition(ast, { force: true });

      expect(ast).toMatchSnapshot();
    });

    it('parses tables with pipes', () => {
      const doc = `
|            |    |
| :--------- | :- |
| foo \\| bar |    |
`;
      const ast = mdast(doc);
      removePosition(ast, { force: true });

      expect(ast).toMatchSnapshot();
    });

    it('parses jsx tables with pipes in inline code', () => {
      const doc = `
<Table align={["left","left"]}>
  <thead>
    <tr>
      <th style={{ textAlign: "left" }}>
        force
        jsx
      </th>

      <th style={{ textAlign: "left" }}>

      </th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td style={{ textAlign: "left" }}>
        \`foo | bar\`
      </td>

      <td style={{ textAlign: "left" }}>

      </td>
    </tr>
  </tbody>
</Table>
`;

      const ast = mdast(doc);
      removePosition(ast, { force: true });

      expect(ast).toMatchSnapshot();
    });
  });

  describe('jsx tables with images', () => {
    it('parses jsx tables with images in cells', () => {
      const doc = `
<Table align={["left","left"]}>
  <thead>
    <tr>
      <th>Image</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>![](https://example.com/image.png)</td>
      <td>An image</td>
    </tr>
  </tbody>
</Table>
`;

      const ast = mdast(doc);
      removePosition(ast, { force: true });

      expect(ast).toMatchSnapshot();
    });
  });
});
