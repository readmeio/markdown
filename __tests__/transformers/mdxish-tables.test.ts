import type { Root } from 'mdast';

import { toHtml } from 'hast-util-to-html';

import { mdxish, mdxishAstProcessor } from '../../lib/mdxish';

const astProcessor = (md: string): Root => {
  const { processor, parserReadyContent } = mdxishAstProcessor(md);
  return processor.runSync(processor.parse(parserReadyContent)) as Root;
};

describe('mdxish tables transformation', () => {
  describe('given \\n in table cell', () => {
    it('should split lines in a magic block table cell into paragraphs', () => {
      const md = `[block:parameters]
  {
    "data": {
      "h-0": "Item",
      "0-0": "Line 1 \\n\\nLine 2 \\n\\nLine 3"
    },
    "cols": 1,
    "rows": 1,
    "align": ["left"]
  }
  [/block]`;
      const ast = astProcessor(md);

      expect(ast).toMatchObject({
        type: 'root',
        children: [
          {
            type: 'table',
            children: [
              {
                type: 'tableRow',
                children: [
                  {
                    type: 'tableHead',
                    children: [{ type: 'text', value: 'Item' }],
                  },
                ],
              },
              {
                type: 'tableRow',
                children: [
                  {
                    type: 'tableCell',
                    children: [
                      { type: 'paragraph', children: [{ type: 'text', value: 'Line 1' }] },
                      { type: 'paragraph', children: [{ type: 'text', value: 'Line 2' }] },
                      { type: 'paragraph', children: [{ type: 'text', value: 'Line 3' }] },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });
    });

    it('should split lines in a JSX <Table> cell into paragraphs', () => {
      const md = `<Table align={["left"]}>
    <thead>
      <tr>
        <th style={{ textAlign: "left" }}>
        </th>
      </tr>
    </thead>

    <tbody>
      <tr>
        <td style={{ textAlign: "left" }}>
          Line 1

          Line 3

          Line 5
        </td>
      </tr>
    </tbody>
  </Table>`;
      const ast = astProcessor(md);

      expect(ast).toMatchObject({
        type: 'root',
        children: [
          {
            type: 'mdxJsxFlowElement',
            name: 'Table',
            children: [
              {
                type: 'mdxJsxFlowElement',
                name: 'thead',
                children: [
                  {
                    type: 'mdxJsxFlowElement',
                    name: 'tr',
                    children: [{ type: 'mdxJsxFlowElement', name: 'th', children: [] }],
                  },
                ],
              },
              {
                type: 'mdxJsxFlowElement',
                name: 'tbody',
                children: [
                  {
                    type: 'mdxJsxFlowElement',
                    name: 'tr',
                    children: [
                      {
                        type: 'mdxJsxFlowElement',
                        name: 'td',
                        children: [
                          { type: 'text', value: 'Line 1' },
                          { type: 'text', value: 'Line 3' },
                          { type: 'text', value: 'Line 5' },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });
    });
  });

  describe('given malformed JSX inside <table>', () => {
    // Stray duplicated </td></tr> makes mdxjs reject the captured value;
    // the non-MDX fallback should still split the html node so blank-line
    // -separated markdown inside the cell parses as real nodes.
    const malformed = `<table>
<thead>
<th>IPv4</th>
</thead>
<tbody>
<tr>
<td>

\`\`\`
2.16.0.0/13
\`\`\`

</td>
</tr>
</td>
</tr>
</tbody>
</table>`;

    it('splits the html node so fenced code blocks become code mdast nodes', () => {
      const ast = astProcessor(malformed);

      expect(ast).toMatchObject({
        type: 'root',
        children: expect.arrayContaining([
          expect.objectContaining({
            type: 'code',
            value: '2.16.0.0/13',
          }),
          expect.objectContaining({ type: 'html' }),
        ]),
      });
    });

    it('renders fenced code blocks as <pre><code> HTML rather than raw backticks', () => {
      const html = toHtml(mdxish(malformed));

      expect(html).toContain('<pre><code');
      expect(html).toContain('2.16.0.0/13');
      expect(html).not.toContain('```');
    });
  });

  describe('given HTML attributes on structural table HTML children', () => {
    describe('with raw HTML tables', () => {
      // Regression test: lowercase `<table>` paths previously dropped
      // class/style/colspan/rowspan because the table was converted to a
      // markdown table node, which can't carry HTML attributes
      it('preserves class attribute', () => {
        const html = toHtml(
          mdxish(`<table>
  <thead>
  <tr><th class="head">A</th></tr>
  </thead>
  <tbody>
  <tr><td>x</td></tr>
  </tbody>
  </table>`),
        );

        expect(html).toContain('<th class="head">A</th>');
      });

      it('preserves colspan attribute', () => {
        const html = toHtml(
          mdxish(`<table>
  <thead>
  <tr><th>A</th><th>B</th></tr>
  </thead>
  <tbody>
  <tr><td colspan="2">merged</td></tr>
  </tbody>
  </table>`),
        );

        expect(html).toContain('<td colspan="2">merged</td>');
      });

      it('preserves inline style', () => {
        const html = toHtml(
          mdxish(`<table>
  <thead>
  <tr><th>A</th></tr>
  </thead>
  <tbody>
  <tr><td style="color:red">x</td></tr>
  </tbody>
  </table>`),
        );

        expect(html).toContain('<td style="color:red">x</td>');
      });

      it('preserves attributes on thead and tbody', () => {
        const html = toHtml(
          mdxish(`<table>
  <thead class="head-group">
  <tr><th>A</th></tr>
  </thead>
  <tbody align="left">
  <tr><td>x</td></tr>
  </tbody>
  </table>`),
        );

        expect(html).toContain('<thead class="head-group">');
        expect(html).toContain('<tbody align="left">');
      });

      it('preserves attributes on columns (colgroup/col)', () => {
        const html = toHtml(
          mdxish(`<table>
          <colgroup class="head-group">
          <col style="width:100px" />
          </colgroup>
          </table>`),
        );
        expect(html).toContain('<colgroup class="head-group">');
        expect(html).toContain('<col style="width:100px">');
      });
    });

    describe('with JSX tables', () => {
      it('preserves class attributes, outputs table in JSX, and denotes table nodes as mdxElements', () => {
        const md = `<Table>
<thead style="color:blue">
<tr>
<th class="head">A</th>
</tr>
</thead>

<tbody style="color:red">
<tr>
<td colspan="2">merged</td>
</tr>
</tbody>

</Table>`;
        const ast = astProcessor(md);

        expect(ast).toMatchObject({
          type: 'root',
          children: [
            {
              type: 'mdxJsxFlowElement',
              name: 'Table',
              children: [
                {
                  type: 'mdxJsxFlowElement',
                  name: 'thead',
                  attributes: [{ type: 'mdxJsxAttribute', name: 'style', value: 'color:blue' }],
                  children: [
                    {
                      type: 'mdxJsxFlowElement',
                      name: 'tr',
                      children: [
                        {
                          type: 'mdxJsxTextElement',
                          name: 'th',
                          attributes: [{ type: 'mdxJsxAttribute', name: 'class', value: 'head' }],
                          children: [{ type: 'text', value: 'A' }],
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'mdxJsxFlowElement',
                  name: 'tbody',
                  attributes: [{ type: 'mdxJsxAttribute', name: 'style', value: 'color:red' }],
                  children: [
                    {
                      type: 'mdxJsxFlowElement',
                      name: 'tr',
                      children: [
                        {
                          type: 'mdxJsxTextElement',
                          name: 'td',
                          attributes: [{ type: 'mdxJsxAttribute', name: 'colspan', value: '2' }],
                          children: [{ type: 'text', value: 'merged' }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        });
      });
    });
  });

  it('should unwrap a sole paragraph in a Table cell', () => {
    const md = `<Table align={["left"]}>
  <thead>
    <tr>
      <th style={{ textAlign: "left" }}>
        Header
      </th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td style={{ textAlign: "left" }}>
        Just one line
      </td>
    </tr>
  </tbody>
</Table>`;
    const ast = astProcessor(md);

    expect(ast).toMatchObject({
      type: 'root',
      children: [
        {
          type: 'mdxJsxFlowElement',
          name: 'Table',
          children: [
            {
              type: 'mdxJsxFlowElement',
              name: 'thead',
              children: [
                {
                  type: 'mdxJsxFlowElement',
                  name: 'tr',
                  children: [
                    {
                      type: 'mdxJsxFlowElement',
                      name: 'th',
                      children: [{ type: 'text', value: 'Header' }],
                    },
                  ],
                },
              ],
            },
            {
              type: 'mdxJsxFlowElement',
              name: 'tbody',
              children: [
                {
                  type: 'mdxJsxFlowElement',
                  name: 'tr',
                  children: [
                    {
                      type: 'mdxJsxFlowElement',
                      name: 'td',
                      children: [{ type: 'text', value: 'Just one line' }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('given raw HTML table', () => {
    it('should render markdown syntax in plain-text cells', () => {
      const md = `<table>
  <thead>
    <tr><th>Header</th></tr>
  </thead>
  <tbody>
    <tr>
      <td>**bold** text</td>
    </tr>
  </tbody>
</table>`;
      const html = toHtml(mdxish(md));
      expect(html).toContain('<strong>bold</strong>');
    });

    it('should preserve <code> wrappers in td cells', () => {
      const md = `<table>
  <thead>
    <tr><th>Attribute</th><th>Description</th></tr>
  </thead>
  <tbody>
    <tr>
      <td><code>action</code></td>
      <td>If true, <code>penalty box</code> is enabled.</td>
    </tr>
  </tbody>
</table>`;
      const html = toHtml(mdxish(md));
      expect(html).toContain('<code>action</code>');
      expect(html).toContain('<code>penalty box</code>');
    });
  });

  it('renders inline HTML elements and markdown syntax as markup', () => {
    const md = `<table>
<thead>
  <tr><th>Header</th></tr>
</thead>
<tbody>
  <tr>
    <td>**bold** and <code>code</code></td>
  </tr>
</tbody>
</table>`;
    const html = toHtml(mdxish(md));
    expect(html).toContain('<code>code</code>');
    expect(html).toContain('<strong>bold</strong>');
  });
});
