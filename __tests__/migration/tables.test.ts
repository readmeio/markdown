import { migrate } from '../../index';

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

    const mdx = migrate(md);
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
    const mdx = migrate(md);

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
    const mdx = migrate(md);

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
    const mdx = migrate(md);

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

    const mdx = migrate(md);
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
    const mdx = migrate(md);

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

  it('compiles tables with emphasis without converting them to lists', () => {
    const md = `
[block:parameters]
{
  "data": {
    "h-0": "**Shortcut Name**",
    "h-1": "**WindowsOS**",
    "h-2": "_Apple - macOS_",
    "0-0": "*Cut selection*",
    "0-1": "__also__\\n\\n_no!_\\n\\n__no no no__",
    "0-2": "!BAD"
  },
  "cols": 3,
  "rows": 1,
  "align": [
    "left",
    "left",
    "left"
  ]
}
[/block]
    `;

    const mdx = migrate(md);

    expect(mdx).toMatchInlineSnapshot(`
      "<Table align={["left","left","left"]}>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>
              **Shortcut Name**
            </th>

            <th style={{ textAlign: "left" }}>
              **WindowsOS**
            </th>

            <th style={{ textAlign: "left" }}>
              *Apple - macOS*
            </th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td style={{ textAlign: "left" }}>
              *Cut selection*
            </td>

            <td style={{ textAlign: "left" }}>
              **also**

              *no!*

              **no no no**
            </td>

            <td style={{ textAlign: "left" }}>
              !BAD
            </td>
          </tr>
        </tbody>
      </Table>
      "
    `);
  });

  it('compiles more examples of emphasis', () => {
    const md = `
    [block:parameters]
{
  "data": {
    "h-0": "Action",
    "h-1": "Description",
    "0-0": "Details",
    "0-1": "View additional details such as:  \\n_Type_  \\n_Owner_  \\n_Created On_  \\n_Last Modified_  \\n_Last Run_"
  },
  "cols": 2,
  "rows": 1,
  "align": [
    "left",
    "left"
  ]
}
[/block]
    `;

    const mdx = migrate(md);

    expect(mdx).toMatchInlineSnapshot(`
      "<Table align={["left","left"]}>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>
              Action
            </th>

            <th style={{ textAlign: "left" }}>
              Description
            </th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td style={{ textAlign: "left" }}>
              Details
            </td>

            <td style={{ textAlign: "left" }}>
              View additional details such as:\\
              *Type*\\
              *Owner*\\
              *Created On*\\
              *Last Modified*\\
              *Last Run*
            </td>
          </tr>
        </tbody>
      </Table>
      "
    `);
  });
});
