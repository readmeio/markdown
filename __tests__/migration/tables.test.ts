import * as rmdx from '../../index';

describe('mdx migration of tables', () => {
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

    const ast = rmdx.mdastV6(md);
    const mdx = rmdx.mdx(ast);
    expect(mdx).toMatchInlineSnapshot(`
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

  it('compiles tables with pseudo-lists', () => {
    const md = `
[block:parameters]
${JSON.stringify(
  {
    data: {
      'h-0': 'Field',
      'h-1': 'Description',
      '0-0': 'numbered lists',
      '0-1': '1. numbered lists\n2. are supported too',
      '1-0': 'loose lists',
      '1-1': '- loose lists\n\n- are supported too',
    },
    cols: 2,
    rows: 2,
    align: ['left', 'left'],
  },
  null,
  2,
)}
[/block]
`;
    const mdx = rmdx.mdx(rmdx.mdastV6(md));

    expect(mdx).toMatchInlineSnapshot(`
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
              numbered lists
            </td>

            <td style={{ textAlign: "left" }}>
              1. numbered lists
              2. are supported too
            </td>
          </tr>

          <tr>
            <td style={{ textAlign: "left" }}>
              loose lists
            </td>

            <td style={{ textAlign: "left" }}>
              * loose lists

              * are supported too
            </td>
          </tr>
        </tbody>
      </Table>
      "
    `);
  });

  it('compiles tables with broken pseudo-lists', () => {
    const md = `
[block:parameters]
${JSON.stringify(
  {
    data: {
      'h-0': 'Field',
      'h-1': 'Description',
      '0-0': 'reproduction',
      '0-1': 'Oh no\n\n_no no no\n_no no no\n*Im so sorry',
      '1-0': 'reproduction 2',
      '1-1': 'Oh no\n\n\\_no no no\n\\_no no no\n\\*Im so sorry',
      '2-0': 'reproduction 3',
      '2-1': 'Oh no\n\n  \\_  no no no\n  _ no no no\n  \\*Im so sorry',
    },
    cols: 2,
    rows: 3,
    align: ['left', 'left'],
  },
  null,
  2,
)}
[/block]
`;
    const mdx = rmdx.mdx(rmdx.mdastV6(md));

    expect(mdx).toMatchInlineSnapshot(`
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
              reproduction
            </td>

            <td style={{ textAlign: "left" }}>
              Oh no

              * no no no
              * no no no
              * Im so sorry
            </td>
          </tr>

          <tr>
            <td style={{ textAlign: "left" }}>
              reproduction 2
            </td>

            <td style={{ textAlign: "left" }}>
              Oh no

              * no no no
              * no no no
              * Im so sorry
            </td>
          </tr>

          <tr>
            <td style={{ textAlign: "left" }}>
              reproduction 3
            </td>

            <td style={{ textAlign: "left" }}>
              Oh no

              * no no no
              * no no no
              * Im so sorry
            </td>
          </tr>
        </tbody>
      </Table>
      "
    `);
  });

  it('compiles tables with html', () => {
    const md = `
| Teléfono                                                           |
| ------------------------------------------------------------------ |
| <p>¿Necesitas ayuda?</p><p>‍</p><p>Llámanos al +52 33 11224455</p> |
      `;
    const mdx = rmdx.mdx(rmdx.mdastV6(md));

    expect(mdx).toMatchInlineSnapshot(`
      "<Table>
        <thead>
          <tr>
            <th>
              Teléfono
            </th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td>
              <p>¿Necesitas ayuda?</p><p>‍</p><p>Llámanos al +52 33 11224455</p>
            </td>
          </tr>
        </tbody>
      </Table>
      "
    `);
  });

  it('does not muck with regular emphasis in tables', () => {
    const md = `
[block:parameters]
${JSON.stringify(
  {
    data: {
      'h-0': '**Shortcut Name**',
      'h-1': '**WindowsOS**',
      '0-0': '**Select None**',
      '0-1': '`ESC`',
      '1-0': '**Select All**',
      '1-1': '`CTRL` + `A`',
    },
    cols: 2,
    rows: 2,
    align: ['left', 'left'],
  },
  null,
  2,
)}
[/block]
    `;

    const ast = rmdx.mdastV6(md);
    const mdx = rmdx.mdx(ast);
    expect(mdx).toMatchInlineSnapshot(`
      "<Table align={["left","left"]}>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>
              **Shortcut Name**
            </th>

            <th style={{ textAlign: "left" }}>
              **WindowsOS**
            </th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td style={{ textAlign: "left" }}>
              **Select None**
            </td>

            <td style={{ textAlign: "left" }}>
              \`ESC\`
            </td>
          </tr>

          <tr>
            <td style={{ textAlign: "left" }}>
              **Select All**
            </td>

            <td style={{ textAlign: "left" }}>
              \`CTRL\` + \`A\`
            </td>
          </tr>
        </tbody>
      </Table>
      "
    `);
  });

  it('compiles tables with null alignment values', () => {
    const md = `
[block:parameters]
${JSON.stringify(
  {
    data: {
      'h-0': 'Field',
      'h-1': 'Description',
      '0-0': 'reproduction',
      '0-1': 'Oh no\n\n_no no no\n_no no no\n*Im so sorry',
    },
    cols: 2,
    rows: 1,
    align: [null, null],
  },
  null,
  2,
)}
[/block]
`;
    const mdx = rmdx.mdx(rmdx.mdastV6(md));

    expect(mdx).toMatchInlineSnapshot(`
      "<Table>
        <thead>
          <tr>
            <th>
              Field
            </th>

            <th>
              Description
            </th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td>
              reproduction
            </td>

            <td>
              Oh no

              * no no no
              * no no no
              * Im so sorry
            </td>
          </tr>
        </tbody>
      </Table>
      "
    `);
  });
});
