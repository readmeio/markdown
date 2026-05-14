import type { Root } from 'mdast';
import type { MdxJsxTextElement } from 'mdast-util-mdx';

import { toHtml } from 'hast-util-to-html';

import { mdxish, mdxishAstProcessor } from '../../lib/mdxish';
import { collectNodes, findAllElementsByTagName, parseMdxishWithSource } from '../helpers';

const astProcessor = (md: string): Root => {
  const { processor, parserReadyContent } = mdxishAstProcessor(md);
  return processor.runSync(processor.parse(parserReadyContent)) as Root;
};

const astAndSource = (md: string): { parserReadyContent: string; tree: Root } => {
  const { processor, parserReadyContent } = mdxishAstProcessor(md);
  const tree = processor.runSync(processor.parse(parserReadyContent)) as Root;
  return { tree, parserReadyContent };
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

  describe('given unclosed tags inside cells that is not MDX valid', () => {
    it('repairs unclosed jsx alongside a jsx expression attribute', () => {
      const doc = `<Table>
<thead><tr><th style={{ textAlign: "left" }}>Heading</th></tr></thead>
<tbody>
  <tr>
    <td>this is <em>broken emphasis</td>
  </tr>
</tbody>
</Table>`;

      const hast = mdxish(doc);
      const tables = findAllElementsByTagName(hast, 'table');
      expect(tables).toHaveLength(1);

      const cells = findAllElementsByTagName(tables[0], 'td');
      expect(cells).toHaveLength(1);
      expect(JSON.stringify(cells[0])).toContain('broken emphasis');
    });

    it('still parses markdown inside a cell after repair', () => {
      // The unclosed <em> would normally crash remarkMdx. After repair the
      // table goes through the MDX-aware pipeline, which means **bold**
      // inside the (well-formed) sibling cell still becomes a <strong>.
      const doc = `<Table>
<thead><tr><th>A</th><th>B</th></tr></thead>
<tbody>
  <tr>
    <td>before <em>oops</td>
    <td>**emphasized**</td>
  </tr>
</tbody>
</Table>`;

      const hast = mdxish(doc);
      const strongs = findAllElementsByTagName(hast, 'strong');
      expect(strongs.length).toBeGreaterThan(0);
      expect(JSON.stringify(strongs[0])).toContain('emphasized');
    });

    it('inserts the closer at a blank line so it lands in the same paragraph as the open', () => {
      // <span> opens in the first paragraph but never closes; the next paragraph
      // continues with more text before </td>. MDX requires the synthetic </span>
      // to land at the paragraph boundary (the blank line), not at </td>, or it
      // gets parsed as a different paragraph and remarkMdx still throws.
      const doc = `<Table>
<thead><tr><th>Description</th></tr></thead>
<tbody>
  <tr>
    <td>
      <span style="color:red">first paragraph with unclosed span.

      second paragraph keeps going.
    </td>
  </tr>
</tbody>
</Table>`;

      const { tree } = parseMdxishWithSource(doc);
      const tableNode = collectNodes(tree, 'table');
      expect(tableNode).toHaveLength(1);

      const hast = mdxish(doc);
      const tables = findAllElementsByTagName(hast, 'table');
      expect(tables).toHaveLength(1);

      const cells = findAllElementsByTagName(tables[0], 'td');
      expect(cells).toHaveLength(1);
      const json = JSON.stringify(cells[0]);
      expect(json).toContain('first paragraph');
      expect(json).toContain('second paragraph');
    });

    it('table does not break with <br> tag', () => {
      const doc = `<Table>
<thead><tr><th>A</th><th>B</th></tr></thead>
<tbody>
  <tr>
    <td>before <br> oops</td>
  </tr>
</tbody>
</Table>`;

      const { tree } = parseMdxishWithSource(doc);
      const tableNode = collectNodes(tree, 'table');
      expect(tableNode).toHaveLength(1);
    });

    it('table does not break when there is <object> tag', () => {
      const doc = `<Table>
  <thead>
    <tr>
      <th>
        Parameter
      </th>

      <th>
        Notes
      </th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td>
        Array <object>
      </td>

      <td>
        Each object can have:<ul><li>type (Enum:
 ROLLBACK)</li><li>enabled (default: true)</li></ul><br
/><br />
      </td>
    </tr>
  </tbody>
</Table>`;

      const { tree } = parseMdxishWithSource(doc);
      const tableNode = collectNodes(tree, 'table');
      expect(tableNode).toHaveLength(1);
    });

    it('table does not break when there is genuine escaped HTML tag', () => {
      const doc = `<Table>
<thead>
  <tr>
    <th>
      Parameter
    </th>

    <th>
      Notes
    </th>

    <th>
      Type
    </th>

    <th>
      Required
    </th>

    <th>
      Possible Values
    </th>
  </tr>
</thead>

<tbody>
  <tr>
    <td>
      urlTracker
    </td>

    <td>
      Specifies

      **_Note:_**_&#x20;Somehthing_<br />**The urlTracker objects are detailed** <p><a href="#C4">**here**</a></p>
    </td>

    <td>
      string
    </td>

    <td>

    </td>

    <td>

    </td>
  </tr>

  <tr>
    <td>
      badgeSettings
    </td>

    <td>
      Cell
    </td>

    <td>
      Array <object>
    </td>

    <td>
      N
    </td>

    <td>
      Enum Values: ROLLBACK, EXPRESS\\_DELIVERY
    </td>
  </tr>

  <tr>
    <td>
      associatedItems
    </td>

    <td>
      Something
    </td>

    <td>
      Array \\<string>
    </td>

    <td>
      N
    </td>

    <td>
      valid <<variable>>
    </td>
  </tr>
</tbody>
</Table>`;

      const { tree } = parseMdxishWithSource(doc);
      const tableNode = collectNodes(tree, 'table');
      expect(tableNode).toHaveLength(1);
    });

    it('does not modify well-formed tables (repair is a no-op)', () => {
      const doc = `<Table>
<thead><tr><th>Heading</th></tr></thead>
<tbody>
  <tr><td>fine</td></tr>
</tbody>
</Table>`;

      const hast = mdxish(doc);
      const tables = findAllElementsByTagName(hast, 'table');
      expect(tables).toHaveLength(1);

      const cells = findAllElementsByTagName(tables[0], 'td');
      expect(cells).toHaveLength(1);
    });

    it('escapes a non-HTML tag name instead of trying to close it', () => {
      const doc = `<Table>
  <thead><tr><th>A</th><th>B</th></tr></thead>
  <tbody>
    <tr>
      <td>literal <non-html-tag> here</td>
      <td>
        <span>unclosed span

        across paragraphs.
      </td>
    </tr>
  </tbody>
</Table>`;

      const hast = mdxish(doc);
      const tables = findAllElementsByTagName(hast, 'table');
      expect(tables).toHaveLength(1);

      // No phantom <randomstuff> element should appear in the tree —
      // the tag was escaped to literal text.
      const phantom = findAllElementsByTagName(tables[0], 'non-html-tag');
      expect(phantom).toHaveLength(0);
      // The literal text survives.
      expect(JSON.stringify(tables[0])).toContain('non-html-tag');
    });
  });

  describe('given asymmetric inline/flow JSX inside cells', () => {
    // mdxjs throws when a JSX element's opener has trailing text on its line
    // but its closer sits alone on its own line (or vice versa). Without
    // recovery the html block falls through unparsed and *everything* inside
    // the table — including unrelated cells with markdown links — fails to
    // render. These tests pin the normalizer.
    it('handles opener with trailing content and closer alone', () => {
      const doc = `<Table>
<thead><tr><th>H1</th><th>H2</th></tr></thead>
<tbody>
  <tr>
    <td>
    [createResponse](doc:create-response)
    </td>
    <td>
      <span>Cell 2
      Cell 3
      </span>
    </td>
  </tr>
</tbody>
</Table>`;

      const hast = mdxish(doc);
      const tables = findAllElementsByTagName(hast, 'table');
      expect(tables).toHaveLength(1);

      // The sibling cell's markdown link must still render — that's the
      // user-visible symptom: when the table fails to parse, even unrelated
      // cells lose their markdown processing.
      const links = findAllElementsByTagName(tables[0], 'a');
      expect(links.length).toBeGreaterThan(0);
      expect(JSON.stringify(links[0])).toContain('createResponse');
    });

    it('handles opener alone and closer with leading content', () => {
      const doc = `<Table>
<thead><tr><th>H</th></tr></thead>
<tbody>
  <tr>
    <td>
      <span>
      text</span>
    </td>
  </tr>
</tbody>
</Table>`;

      const hast = mdxish(doc);
      const tables = findAllElementsByTagName(hast, 'table');
      expect(tables).toHaveLength(1);
      expect(JSON.stringify(tables[0])).toContain('text');
    });

    it('handles text before opener on same line, closer alone', () => {
      // The text before <span> binds the opener to a paragraph context, so
      // mdxjs needs the closer to also be in that paragraph. Normalizer
      // pushes both to flow level instead.
      const doc = `<Table>
<thead><tr><th>H1</th><th>H2</th></tr></thead>
<tbody>
  <tr>
    <td>
      [createResponse](doc:create-response)
    </td>
    <td>
      Cell 2 <span>
      Cell 3
      </span>
    </td>
  </tr>
</tbody>
</Table>`;

      const hast = mdxish(doc);
      const tables = findAllElementsByTagName(hast, 'table');
      expect(tables).toHaveLength(1);

      const links = findAllElementsByTagName(tables[0], 'a');
      expect(links.length).toBeGreaterThan(0);
      expect(JSON.stringify(links[0])).toContain('createResponse');
      expect(JSON.stringify(tables[0])).toContain('Cell 2');
      expect(JSON.stringify(tables[0])).toContain('Cell 3');
    });

    it('handles trailing text after closer on its line', () => {
      const doc = `<Table>
<thead><tr><th>H</th></tr></thead>
<tbody>
  <tr>
    <td>
      <span>
      X
      </span> trailing
    </td>
  </tr>
</tbody>
</Table>`;

      const hast = mdxish(doc);
      const tables = findAllElementsByTagName(hast, 'table');
      expect(tables).toHaveLength(1);
      expect(JSON.stringify(tables[0])).toContain('trailing');
    });

    it('does not modify symmetric well-formed JSX (normalizer is a no-op)', () => {
      const doc = `<Table>
<thead><tr><th>H</th></tr></thead>
<tbody>
  <tr><td><span>inline</span></td></tr>
  <tr><td>
    <span>
      flow
    </span>
  </td></tr>
</tbody>
</Table>`;

      const hast = mdxish(doc);
      const tables = findAllElementsByTagName(hast, 'table');
      expect(tables).toHaveLength(1);

      const cells = findAllElementsByTagName(tables[0], 'td');
      expect(cells).toHaveLength(2);
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

  describe('node position fidelity', () => {
    it('produces global offsets for JSX nodes inside re-parsed <Table> html cells', () => {
      const md = `<Table align={[null, null, null]}>
  <thead>
    <tr>
      <th>Parameter</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        List of configurations:<ul><li>type</li><li>enabled</li></ul><br /><br />
      </td>
    </tr>
  </tbody>
</Table>`;

      const { tree, parserReadyContent } = astAndSource(md);

      const ul = collectNodes(tree, (node) => node.type === 'mdxJsxTextElement' && (node as MdxJsxTextElement).name === 'ul');

      expect(ul).toHaveLength(1);
      const { start, end } = ul[0].position!;
      const slice = parserReadyContent.slice(start.offset!, end.offset!);
      expect(slice.startsWith('<ul')).toBe(true);
      expect(slice.endsWith('</ul>')).toBe(true);
    });

    it('remaps descendant positions back to the original source when the repair retry path modifies it', () => {
      const md = `<Table>
  <tbody>
    <tr>
      <td>
        Array <object>
      </td>
      <td>
        List of badge configurations:<ul><li>type</li><li>enabled</li></ul><br /><br />
      </td>
    </tr>
  </tbody>
</Table>`;

      const { tree, parserReadyContent } = astAndSource(md);

      const ul = collectNodes(tree, (node) => node.type === 'mdxJsxTextElement' && (node as MdxJsxTextElement).name === 'ul');
      expect(ul).toHaveLength(1);
      const { start, end } = ul[0].position!;
      const slice = parserReadyContent.slice(start.offset!, end.offset!);
      expect(slice.startsWith('<ul')).toBe(true);
      expect(slice.endsWith('</ul>')).toBe(true);
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
