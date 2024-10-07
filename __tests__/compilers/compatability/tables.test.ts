import { mdx } from '../../../index';
import * as rdmd from '@readme/markdown-legacy';

describe('table compatability', () => {
  it('compiles tables with newlines and inline code', () => {
    const md = `
[block:parameters]
${JSON.stringify(
  {
    data: {
      'h-0': 'Field',
      'h-1': 'Description',
      '0-0': 'orderby',
      '0-1': '`{\n  "field": "ID",\n  "type": "ASC"\n}`',
    },
    cols: 2,
    rows: 1,
    align: ['left', 'left'],
  },
  null,
  2,
)}
[/block]
    `;

    const ast = rdmd.mdast(md);
    const rmdx = mdx(ast);
    expect(rmdx).toMatchInlineSnapshot(`
      "<Table align={["left","left"]}>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>
              Field
            </th>

            <th style={{ textAlign: "left" }}>
              Description
            </th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td style={{ textAlign: "left" }}>
              orderby
            </td>

            <td style={{ textAlign: "left" }}>
              \`\`\`
              {
                "field": "ID",
                "type": "ASC"
              }
              \`\`\`
            </td>
          </tr>
        </tbody>
      </Table>
      "
    `);
  });
});
