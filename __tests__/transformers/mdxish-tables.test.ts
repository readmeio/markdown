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
            type: 'table',
            children: [
              {
                type: 'tableRow',
                children: [{ type: 'tableCell', children: [] }],
              },
              {
                type: 'tableRow',
                children: [
                  {
                    type: 'tableCell',
                    children: [
                      { type: 'paragraph', children: [{ type: 'text', value: 'Line 1' }] },
                      { type: 'paragraph', children: [{ type: 'text', value: 'Line 3' }] },
                      { type: 'paragraph', children: [{ type: 'text', value: 'Line 5' }] },
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

  it('should unwrap a sole paragraph in a table cell', () => {
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
          type: 'table',
          children: [
            {
              type: 'tableRow',
              children: [
                {
                  type: 'tableCell',
                  children: [{ type: 'text', value: 'Header' }],
                },
              ],
            },
            {
              type: 'tableRow',
              children: [
                {
                  type: 'tableCell',
                  children: [{ type: 'text', value: 'Just one line' }],
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
