import type { Root, Text } from 'mdast';
import type { MdxFlowExpression, MdxJsxTextElement } from 'mdast-util-mdx';

import { toHtml } from 'hast-util-to-html';

import { mdxish, mdxishAstProcessor } from '../../lib/mdxish';
import { collectNodes, findAllElementsByTagName, parseMdxishWithSource, roundTripMdxish } from '../helpers';

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
          },
        ],
      });
    });
  });

  describe('given blank-line-separated paragraphs in a header-less table cell', () => {
    // A <tbody>-only table can't become an mdast table (no header row), so it
    // stays JSX — paragraphs inside cells must survive that path
    it('keeps the paragraphs as separate mdast nodes', () => {
      const md = `<table><tbody><tr><td>
First paragraph.

Second paragraph.
</td></tr></tbody></table>`;
      const ast = astProcessor(md);

      expect(ast).toMatchObject({
        type: 'root',
        children: [
          {
            type: 'mdxJsxFlowElement',
            name: 'table',
            children: [
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
                          { type: 'paragraph', children: [{ type: 'text', value: 'First paragraph.' }] },
                          { type: 'paragraph', children: [{ type: 'text', value: 'Second paragraph.' }] },
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

    it('renders the paragraphs as separate <p> elements', () => {
      const md = `<table><tbody><tr><td>
First paragraph.

Second paragraph.
</td></tr></tbody></table>`;
      const html = toHtml(mdxish(md));

      expect(html).toContain('<td><p>First paragraph.</p><p>Second paragraph.</p></td>');
    });

    it('renders separate <p> elements when the content is condensed against the tags', () => {
      const md = `<table><tbody><tr><td>First paragraph.

Second paragraph.</td></tr></tbody></table>`;
      const html = toHtml(mdxish(md));

      expect(html).toContain('<p>First paragraph.</p>');
      expect(html).toContain('<p>Second paragraph.</p>');
    });

    it('treats multiple blank lines and indentation as a single paragraph break', () => {
      const md = `<table>
  <tbody>
    <tr>
      <td>
        First paragraph.



        Second paragraph.
      </td>
    </tr>
  </tbody>
</table>`;
      const html = toHtml(mdxish(md));

      expect(html).toContain('<td><p>First paragraph.</p><p>Second paragraph.</p></td>');
    });

    it('still parses markdown syntax inside each paragraph', () => {
      const md = `<table><tbody><tr><td>
**First** paragraph.

_Second_ paragraph.
</td></tr></tbody></table>`;
      const html = toHtml(mdxish(md));

      expect(html).toContain('<p><strong>First</strong> paragraph.</p>');
      expect(html).toContain('<p><em>Second</em> paragraph.</p>');
    });

    it('preserves paragraphs in a JSX <Table> kept as JSX by structural attributes', () => {
      const md = `<Table>
  <thead>
    <tr><th class="head">Header</th></tr>
  </thead>
  <tbody>
    <tr>
      <td>
        First paragraph.

        Second paragraph.
      </td>
    </tr>
  </tbody>
</Table>`;
      const html = toHtml(mdxish(md));

      expect(html).toContain('<td><p>First paragraph.</p><p>Second paragraph.</p></td>');
    });

    it('keeps paragraphs separate from a sibling list in the same cell', () => {
      const md = `<table><tbody><tr><td>
First paragraph.

- item one
- item two

Second paragraph.
</td></tr></tbody></table>`;
      const hast = mdxish(md);
      const cells = findAllElementsByTagName(hast, 'td');
      expect(cells).toHaveLength(1);

      const lists = findAllElementsByTagName(cells[0], 'ul');
      expect(lists).toHaveLength(1);
      expect(findAllElementsByTagName(lists[0], 'li')).toHaveLength(2);

      const html = toHtml(cells[0]);
      expect(html).toContain('First paragraph.');
      expect(html).toContain('Second paragraph.');
    });

    it('still unwraps a sole paragraph in a header-less cell (no stray <p>)', () => {
      const md = `<table><tbody><tr><td>
Just one line.
</td></tr></tbody></table>`;
      const html = toHtml(mdxish(md));

      expect(html).toContain('<td>Just one line.</td>');
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

    it('parses fenced code blocks inside the cell as code mdast nodes', () => {
      const ast = astProcessor(malformed);
      const codes = collectNodes(ast, 'code');
      expect(codes).toHaveLength(1);
      expect(codes[0]).toMatchObject({ type: 'code', value: '2.16.0.0/13' });
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

    it('strips orphan closing tags that have no matching opener', () => {
      const doc = `<Table align={["left","left"]}>
  <thead>
    <tr>
      <th>Field</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Status</td>
      <td>
        Current state.

        Values:<ul><li>**active**. running. <li>**inactive**. stopped.</ul></li>
      </td>
    </tr>
    <tr>
      <td>Type</td>
      <td>Normal value here.</td>
    </tr>
  </tbody>
</Table>`;

      const hast = mdxish(doc);
      const tables = findAllElementsByTagName(hast, 'table');
      expect(tables).toHaveLength(1);

      const cells = findAllElementsByTagName(tables[0], 'td');
      expect(cells).toHaveLength(4);

      const strongs = findAllElementsByTagName(tables[0], 'strong');
      expect(strongs.length).toBeGreaterThanOrEqual(2);
      const strongText = strongs.map(s => JSON.stringify(s)).join(' ');
      expect(strongText).toContain('active');
      expect(strongText).toContain('inactive');

      const html = toHtml(tables[0]);
      expect(html).not.toContain('&#x3C;/li>');
      expect(html).not.toContain('&lt;/li>');
    });

    // Special case for void tag <br>: In legacy magic blocks, orphan </br> is treated
    // as a legit line break and not stripped like other void tags like </hr> or </img>.
    it('considers orphan </br> as a line break and not have it break the table', () => {
      const doc = `<Table align={["left","left"]}>
  <thead>
    <tr>
      <th>Field</th>
      <th>Action</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>**Instant Failover**</td>
      <td>
        Select one of these options:

        - **First**.
        - **Second**.
        - **Third**. Disabled<br /><br />Second paragraph</br><br />Third paragraph</br>
      </td>
    </tr>
  </tbody>
</Table>`;

      const hast = mdxish(doc);
      const tables = findAllElementsByTagName(hast, 'table');
      expect(tables).toHaveLength(1);

      const cells = findAllElementsByTagName(tables[0], 'td');
      expect(cells).toHaveLength(2);

      const lists = findAllElementsByTagName(tables[0], 'ul');
      expect(lists).toHaveLength(1);
      const items = findAllElementsByTagName(lists[0], 'li');
      expect(items).toHaveLength(3);

      const strongs = findAllElementsByTagName(tables[0], 'strong');
      const strongText = strongs.map(s => JSON.stringify(s)).join(' ');
      expect(strongText).toContain('Instant Failover');
      expect(strongText).toContain('First');
      expect(strongText).toContain('Second');
      expect(strongText).toContain('Third');

      // Per HTML5 spec, a lone </br> is rewritten as a <br> break — not stripped.
      const breaks = findAllElementsByTagName(tables[0], 'br');
      expect(breaks).toHaveLength(5);

      const html = toHtml(tables[0]);
      expect(html).toContain('Disabled<br><br>Second paragraph<br><br>Third paragraph<br>');
      expect(html).not.toContain('&#x3C;/br>');
      expect(html).not.toContain('&lt;/br>');
      expect(html).not.toContain('</br>');
      expect(html).not.toContain('Second paragraph/');
    });

    it.each([
      ['hr', '<hr>'],
      ['img', '<img src="x.png" alt="x">'],
      ['input', '<input type="text">'],
    ])('strips an orphan </%s> closer for void element', (tag, opener) => {
      const doc = `<Table>
  <thead><tr><th>A</th></tr></thead>
  <tbody>
    <tr>
      <td>before ${opener} middle </${tag}> after **bold**</td>
    </tr>
  </tbody>
</Table>`;

      const hast = mdxish(doc);
      const tables = findAllElementsByTagName(hast, 'table');
      expect(tables).toHaveLength(1);

      const cells = findAllElementsByTagName(tables[0], 'td');
      expect(cells).toHaveLength(1);

      const strongs = findAllElementsByTagName(tables[0], 'strong');
      expect(strongs).toHaveLength(1);

      const html = toHtml(tables[0]);
      expect(html).not.toContain(`&#x3C;/${tag}>`);
      expect(html).not.toContain(`&lt;/${tag}>`);
      expect(html).not.toContain('**bold**');
    });

    it('strips multiple orphan void closers mixed with valid markdown', () => {
      const doc = `<Table>
  <thead><tr><th>A</th></tr></thead>
  <tbody>
    <tr>
      <td>line one</br> line two</hr> [link](https://example.com) tail</td>
    </tr>
  </tbody>
</Table>`;

      const hast = mdxish(doc);
      const tables = findAllElementsByTagName(hast, 'table');
      expect(tables).toHaveLength(1);

      const anchors = findAllElementsByTagName(tables[0], 'a');
      expect(anchors).toHaveLength(1);
      expect(anchors[0].properties).toMatchObject({ href: 'https://example.com' });

      const html = toHtml(tables[0]);
      expect(html).not.toContain('&#x3C;/br>');
      expect(html).not.toContain('&lt;/br>');
      expect(html).not.toContain('&#x3C;/hr>');
      expect(html).not.toContain('&lt;/hr>');
    });

    it('preserves an HTML comment containing tag-like text in a cell', () => {
      const doc = `<Table>
  <thead><tr><th>A</th></tr></thead>
  <tbody>
    <tr>
      <td><!-- TODO: handle </li> case --> body text</td>
    </tr>
  </tbody>
</Table>`;
      const hast = mdxish(doc);
      const tables = findAllElementsByTagName(hast, 'table');
      expect(tables).toHaveLength(1);

      const cells = findAllElementsByTagName(tables[0], 'td');
      expect(cells).toHaveLength(1);

      const html = toHtml(tables[0]);
      expect(html).toContain('body text');
      expect(html).toContain('<!-- TODO: handle </li> case -->');
    });

    it('preserves attribute values that contain a > character', () => {
      const doc = `<Table>
  <thead><tr><th>A</th></tr></thead>
  <tbody>
    <tr>
      <td><a title="a > b" href="https://example.com">link</a> after</td>
    </tr>
  </tbody>
</Table>`;
      const hast = mdxish(doc);
      const tables = findAllElementsByTagName(hast, 'table');
      expect(tables).toHaveLength(1);

      const anchors = findAllElementsByTagName(tables[0], 'a');
      expect(anchors).toHaveLength(1);
      expect(anchors[0].properties).toMatchObject({
        href: 'https://example.com',
        title: 'a > b',
      });

      const html = toHtml(tables[0]);
      expect(html).toContain('after');
    });

    it('normalizes interleaved misnesting like <b><i>x</b></i>', () => {
      const doc = `<Table>
  <thead><tr><th>A</th></tr></thead>
  <tbody>
    <tr>
      <td><b><i>x</b></i> after</td>
    </tr>
  </tbody>
</Table>`;
      const hast = mdxish(doc);
      const tables = findAllElementsByTagName(hast, 'table');
      expect(tables).toHaveLength(1);

      const bolds = findAllElementsByTagName(tables[0], 'b');
      const italics = findAllElementsByTagName(tables[0], 'i');
      expect(bolds).toHaveLength(1);
      expect(italics).toHaveLength(1);

      const html = toHtml(tables[0]);
      expect(html).toContain('x');
      expect(html).toContain('after');
      // No stray closers should leak through as escaped text.
      expect(html).not.toContain('&#x3C;/');
      expect(html).not.toContain('&lt;/');
    });

    it('preserves an HTML comment when the orphan-closer scanner is forced to run', () => {
      const doc = `<Table>
  <thead><tr><th>A</th></tr></thead>
  <tbody>
    <tr>
      <td><!-- handle </li> case --> body <ul><li>x</ul></li></td>
    </tr>
  </tbody>
</Table>`;
      const hast = mdxish(doc);
      const tables = findAllElementsByTagName(hast, 'table');
      expect(tables).toHaveLength(1);

      const lists = findAllElementsByTagName(tables[0], 'ul');
      expect(lists).toHaveLength(1);
      const items = findAllElementsByTagName(lists[0], 'li');
      expect(items).toHaveLength(1);

      const html = toHtml(tables[0]);
      expect(html).toContain('<!-- handle </li> case -->');
      expect(html).toContain('body');
      // The trailing orphan </li> after </ul> should not survive as escaped text.
      expect(html).not.toContain('&#x3C;/li>');
      expect(html).not.toContain('&lt;/li>');
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

  describe('given a stray < that does not begin a tag', () => {
    const buildTable = (cell: string): string => `<Table>
  <thead>
    <tr><th>Col 1</th><th>_Col 2_</th></tr>
  </thead>
  <tbody>
    <tr>
      <td>**Custom**</td>
      <td>
        ${cell}
      </td>
    </tr>
  </tbody>
</Table>`;

    it('keeps a trailing < as literal text while still processing cell markdown', () => {
      const hast = mdxish(buildTable('word <'));
      const tables = findAllElementsByTagName(hast, 'table');
      expect(tables).toHaveLength(1);

      // Sibling cell markdown must render — the symptom of the failed parse is
      // that even unrelated cells lose their markdown processing.
      const strongs = findAllElementsByTagName(tables[0], 'strong');
      expect(strongs).toHaveLength(1);
      expect(JSON.stringify(strongs[0])).toContain('Custom');

      const cells = findAllElementsByTagName(tables[0], 'td');
      expect(JSON.stringify(cells[1])).toContain('word <');
    });

    it('keeps a < followed by a digit (<1>) as literal text', () => {
      const hast = mdxish(buildTable('a <1>'));
      const tables = findAllElementsByTagName(hast, 'table');
      expect(tables).toHaveLength(1);

      expect(findAllElementsByTagName(tables[0], 'strong')).toHaveLength(1);

      const cells = findAllElementsByTagName(tables[0], 'td');
      expect(JSON.stringify(cells[1])).toContain('a <1>');
      // The `<1>` must not be interpreted as an element.
      expect(findAllElementsByTagName(tables[0], '1')).toHaveLength(0);
    });

    it('handles a stray < condensed against surrounding markdown', () => {
      const hast = mdxish(buildTable('see **bold** < and _more_'));
      const tables = findAllElementsByTagName(hast, 'table');
      expect(tables).toHaveLength(1);

      // Both the sibling cell bold and the in-cell bold/italic survive.
      expect(findAllElementsByTagName(tables[0], 'strong').length).toBeGreaterThanOrEqual(2);
      expect(findAllElementsByTagName(tables[0], 'em').length).toBeGreaterThanOrEqual(1);
      expect(JSON.stringify(tables[0])).toContain('<');
    });

    it('does not touch a < inside inline code (masked region)', () => {
      const hast = mdxish(buildTable('`a < b`'));
      const tables = findAllElementsByTagName(hast, 'table');
      expect(tables).toHaveLength(1);

      const codes = findAllElementsByTagName(tables[0], 'code');
      expect(codes).toHaveLength(1);
      expect(JSON.stringify(codes[0])).toContain('a < b');
      // No stray backslash should have been injected into the code span.
      expect(JSON.stringify(codes[0])).not.toContain('\\\\');
    });

    it('still parses a genuine tag in the same cell (no over-escaping)', () => {
      const hast = mdxish(buildTable('one < two <br/> three'));
      const tables = findAllElementsByTagName(hast, 'table');
      expect(tables).toHaveLength(1);

      // The real <br/> is preserved as an element while the stray < is literal.
      expect(findAllElementsByTagName(tables[0], 'br')).toHaveLength(1);
      expect(JSON.stringify(tables[0])).toContain('one <');
    });
  });

  describe('given emphasis that crosses an HTML tag boundary inside a cell', () => {
    it('escapes an underscore that opens outside a list and closes inside it', () => {
      // `_` opens before `<ul>` (tag depth N) but closes inside `<li>` (depth
      // N+2), which makes mdxjs throw and drop the whole table's markdown.
      const doc = `<Table>
<tbody>
<tr>
<td>**bold**</td>
<td>_<ul><li>crossing underscore_</li></ul></td>
</tr>
</tbody>
</Table>`;

      const hast = mdxish(doc);
      const tables = findAllElementsByTagName(hast, 'table');
      expect(tables).toHaveLength(1);

      // Sibling cell markdown must still render; the crossing `_` degrades to
      // a literal underscore rather than breaking the table.
      const strongs = findAllElementsByTagName(tables[0], 'strong');
      expect(strongs).toHaveLength(1);
      expect(JSON.stringify(strongs[0])).toContain('bold');

      expect(findAllElementsByTagName(tables[0], 'ul')).toHaveLength(1);
      const items = findAllElementsByTagName(tables[0], 'li');
      expect(items).toHaveLength(1);
      expect(JSON.stringify(items[0])).toContain('crossing underscore_');
      expect(findAllElementsByTagName(items[0], 'em')).toHaveLength(0);
    });

    it('keeps well-formed emphasis inside a deeper tag while escaping the crossing one', () => {
      const doc = `<Table>
<tbody>
<tr>
<td>**heading**</td>
<td>**_Note:_**  _<ul><li>opener escaped_ </li><li>_kept italic_</li></ul></td>
</tr>
</tbody>
</Table>`;

      const hast = mdxish(doc);
      const tables = findAllElementsByTagName(hast, 'table');
      expect(tables).toHaveLength(1);

      // `**_Note:_**` and the balanced `_kept italic_` inside the second <li>
      // are well-formed and must render; only the crossing `_` is escaped.
      const html = toHtml(tables[0]);
      expect(html).toContain('<strong><em>Note:</em></strong>');
      expect(html).toContain('<li><em>kept italic</em></li>');
      expect(html).toContain('opener escaped_');
      expect(html).not.toContain('**_Note');
    });

    it('escapes a crossing bold (**) run the same way as underscores', () => {
      const doc = `<Table>
<tbody>
<tr>
<td>ok</td>
<td>**<ul><li>bold crosses**</li></ul></td>
</tr>
</tbody>
</Table>`;

      const hast = mdxish(doc);
      const tables = findAllElementsByTagName(hast, 'table');
      expect(tables).toHaveLength(1);

      const items = findAllElementsByTagName(tables[0], 'li');
      expect(items).toHaveLength(1);
      expect(JSON.stringify(items[0])).toContain('bold crosses**');
      expect(findAllElementsByTagName(items[0], 'strong')).toHaveLength(0);
    });

    it('does not touch snake_case or emphasis contained within a single tag', () => {
      const doc = `<Table>
<tbody>
<tr>
<td>**keep**</td>
<td><ul><li>uses snake_case_name and _real italic_ here</li></ul></td>
</tr>
</tbody>
</Table>`;

      const hast = mdxish(doc);
      const tables = findAllElementsByTagName(hast, 'table');
      expect(tables).toHaveLength(1);

      // Emphasis fully inside the <li> is well-formed, so it renders and the
      // intraword underscores stay literal — no repair needed here.
      const items = findAllElementsByTagName(tables[0], 'li');
      expect(items).toHaveLength(1);
      const emphasis = findAllElementsByTagName(items[0], 'em');
      expect(emphasis).toHaveLength(1);
      expect(JSON.stringify(emphasis[0])).toContain('real italic');
      expect(JSON.stringify(items[0])).toContain('snake_case_name');
    });

    it('leaves an underscore inside inline code untouched (masked region)', () => {
      const doc = `<Table>
<tbody>
<tr>
<td>**keep**</td>
<td>\`_<ul>_\` and text</td>
</tr>
</tbody>
</Table>`;

      const hast = mdxish(doc);
      const tables = findAllElementsByTagName(hast, 'table');
      expect(tables).toHaveLength(1);

      const codes = findAllElementsByTagName(tables[0], 'code');
      expect(codes).toHaveLength(1);
      expect(JSON.stringify(codes[0])).toContain('_<ul>_');
      expect(JSON.stringify(codes[0])).not.toContain('\\\\');
    });
  });

  describe('given independent parse defects in different cells (chained repairs)', () => {
    it('fixes crossing emphasis in one cell and a blank-line-split <ul> in another', () => {
      // Each cell fails mdxjs for a different reason: cell 1 has emphasis that
      // crosses a tag boundary (escapeCrossingEmphasis) and cell 2 has a `<ul>`
      // that spans a blank line / paragraph break (normalizeTagSpacing). Neither
      // repair fixes both alone — they have to stack for the table to parse.
      const doc = `<Table>
<tbody>
<tr>
<td>
Intro.  _<ul><li>crossing underscore_</li></ul>
</td>
<td>
Values: \`A\`, \`B\`<ul><li>first</li><li></li>

Trailing paragraph then\`C\`<li>last</li></ul>
</td>
</tr>
</tbody>
</Table>`;

      const hast = mdxish(doc);
      const tables = findAllElementsByTagName(hast, 'table');
      expect(tables).toHaveLength(1);

      const cells = findAllElementsByTagName(tables[0], 'td');
      expect(cells).toHaveLength(2);

      // Cell 1: crossing `_` degraded to literal, list still rendered.
      expect(JSON.stringify(cells[0])).toContain('crossing underscore_');
      // Cell 2: inline code parsed rather than left as raw backticks.
      const codes = findAllElementsByTagName(tables[0], 'code');
      expect(codes.length).toBeGreaterThanOrEqual(3);
      const html = toHtml(tables[0]);
      expect(html).toContain('<code>A</code>');
      expect(html).not.toContain('`A`');
      // Both cells' lists survive the two-cell layout.
      expect(findAllElementsByTagName(tables[0], 'ul')).toHaveLength(2);
    });

    it('renders the reported two-cell table without leaking literal markdown', () => {
      const doc = `<Table>
<tbody>
<tr>
<td>
The last day to be considered in the performance report snapshot. It cannot be the current date.  <br />**_Note:_**  _<ul><li>The reports encompass data until the end of the day (23:59:59 hrs ET) for this particular date_ </li><li>_If report data is not available for the requested end date, the request will fail, and the response will contain endDate until which the performance report is available_</li></ul>
</td>
<td>
Possible values: \`CAMPAIGN\`, \`CAMPAIGN_GROUP\`<ul><li>When \`reportType\` is set to \`campaign\`, \`lineItem\`,  \`sku\`,  or \`newBuyer\`, the default value of \`scope\` = \`CAMPAIGN\`</li><li>When \`reportType\` is set to \`creative\`, \`tactic\`, or \`bid\`: \`scope\` = \`CAMPAIGN_GROUP\` is not supported and will return an error.</li><li></li>

When \`scope\` = \`CAMPAIGN_GROUP\`, the \`campaign\`, \`lineItem\`, \`sku\`, \`newBuyer\` reports will have 2 additional fields: \`campaignGroupId\` and  \`campaignGroupName\`<li>If \`scope\` isn't defined in the request, it will be set to \`CAMPAIGN\` by default.</li></ul>
</td>
</tr>
</tbody>
</Table>`;

      const html = toHtml(mdxish(doc));
      expect(html).toContain('<table');
      expect(html).toContain('<strong><em>Note:</em></strong>');
      expect(html).not.toContain('**_Note');
      expect(html).toContain('<code>CAMPAIGN</code>');
      expect(html).not.toContain('`CAMPAIGN`');
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

    it('handles where there is asymmetry both in the opener and the closer', () => {
      const doc = `<Table>
  <thead>
    <tr><th>Icon</th><th>Status</th></tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <div style="text-align:center; color:red">hi

        there</div>
      </td>
      <td>**Enabled**. The device is active.</td>
    </tr>
  </tbody>
</Table>`;

      const tree = parseMdxishWithSource(doc);
      const tableNodes = collectNodes(tree.tree, 'table');
      expect(tableNodes).toHaveLength(1);
    });
  });

  describe('given backslash escapes inside a {…} expression', () => {
    // mdxjs hands `{…}` to acorn as JS; a markdown-style escape like `\_` is
    // invalid JS and would otherwise drop parsing for the whole <Table>.
    it('parses the table and strips the escape inside the expression', () => {
      const doc = `<Table align={["left","left"]}>
  <thead>
    <tr>
      <th>Key</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>**loginPolicy**</td>
      <td>
the /{customer\\_id}/config/clients operation
      </td>
    </tr>
  </tbody>
</Table>`;

      const hast = mdxish(doc);
      const tables = findAllElementsByTagName(hast, 'table');
      expect(tables).toHaveLength(1);

      // Markdown inside cells is parsed (not left as raw HTML).
      const strongs = findAllElementsByTagName(tables[0], 'strong');
      expect(strongs.length).toBeGreaterThan(0);
      expect(JSON.stringify(strongs[0])).toContain('loginPolicy');

      // The align attribute is evaluated, not rendered verbatim.
      const headers = findAllElementsByTagName(tables[0], 'th');
      expect(headers[0].properties?.align).toBe('left');

      // The escape is dropped, leaving the literal path text.
      const cells = findAllElementsByTagName(tables[0], 'td');
      expect(JSON.stringify(cells)).toContain('/{customer_id}/config/clients');
    });

    it('preserves a valid backslash escape inside a string literal', () => {
      // The `\t` lives inside a JS string, so it is a valid escape and must
      // survive — only code-position backslashes are stripped.
      const doc = `<Table align={["a\\tb"]}>
<thead><tr><th>H</th></tr></thead>
<tbody><tr><td>x</td></tr></tbody>
</Table>`;

      const hast = mdxish(doc);
      const tables = findAllElementsByTagName(hast, 'table');
      expect(tables).toHaveLength(1);

      const headers = findAllElementsByTagName(tables[0], 'th');
      expect(headers[0].properties?.align).toBe('a\tb');
    });

    it('does not strip a backslash from within a JSX-style comment', () => {
      // The cell holds a code-position escape (forcing the repair pass) plus a
      // JSX comment containing its own backslash. The repair must strip only the
      // code-position escape, leaving the comment — and thus the table — intact.
      const doc = `<Table align={["left"]}>
  <thead><tr><th>Key</th></tr></thead>
  <tbody>
    <tr>
      <td>{customer\\_id /* keep this \\_ */}</td>
    </tr>
  </tbody>
</Table>`;

      const hast = mdxish(doc);
      const tables = findAllElementsByTagName(hast, 'table');
      expect(tables).toHaveLength(1);

      const headers = findAllElementsByTagName(tables[0], 'th');
      expect(headers[0].properties?.align).toBe('left');
    });
  });

  describe('given JSX-style comments inside a table cell', () => {
    it('preserves the comment as is and it does not break the table parsing', () => {
      const doc = `<Table align={["left"]}>
  <thead><tr><th>Key</th></tr></thead>
  <tbody>
    <tr>
      <td>
      {/* keep this comment */}
      **content here**
      </td>
    </tr>
  </tbody>
</Table>`;
      const { tree } = parseMdxishWithSource(doc);

      const mdxFlowExpression = collectNodes(tree, 'mdxFlowExpression');
      expect(mdxFlowExpression).toHaveLength(1);
      expect((mdxFlowExpression[0] as MdxFlowExpression).value).toBe('/* keep this comment */');

      const strong = collectNodes(tree, 'strong');
      expect(strong).toHaveLength(1);
    });

    it('special characters in a comment are not stripped', () => {
      const doc = `<Table align={["left"]}>
  <thead><tr><th>Key</th></tr></thead>
  <tbody>
    <tr>
      <td>
      {/* keep this comment \\_ and * / / and < and > */}
      **content here**
      </td>
    </tr>
  </tbody>
</Table>`;
      const { tree } = parseMdxishWithSource(doc);

      const mdxFlowExpression = collectNodes(tree, 'mdxFlowExpression');
      expect(mdxFlowExpression).toHaveLength(1);
      expect((mdxFlowExpression[0] as MdxFlowExpression).value).toBe('/* keep this comment \\_ and * / / and < and > */');

      const strong = collectNodes(tree, 'strong');
      expect(strong).toHaveLength(1);
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

      const mdxSlices = collectNodes(
        tree,
        node => node.type === 'mdxJsxTextElement' || node.type === 'mdxJsxFlowElement',
      ).map(node => {
        const { position } = node as MdxJsxTextElement;
        return parserReadyContent.slice(position!.start.offset!, position!.end.offset!);
      });

      expect(mdxSlices).toStrictEqual(expect.arrayContaining([
        '<object>',
        '<li>type</li>',
        '<li>enabled</li>',
        '<ul><li>type</li><li>enabled</li></ul>',
        '<br />',
      ]));

      const textSlices = collectNodes(
        tree,
        node => node.type === 'text',
      ).map(node => {
        const { position } = node as Text;
        return parserReadyContent.slice(position!.start.offset!, position!.end.offset!);
      });

      expect(textSlices).toStrictEqual(expect.arrayContaining([
        'Array ',
        'List of badge configurations:',
        'type',
        'enabled',
      ]));
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

  describe('<pre> formatting inside HTML table cells', () => {
    it('preserves <pre> indentation when <pre> is at column 0 inside a table', () => {
      const md = `<table>
<tr>
<td>
<pre data-lang="json">
{
  "a": "x",
  "b": {
    "c": "y"
  }
}
</pre>
</td>
</tr>
</table>`;

      const out = roundTripMdxish(md);
      expect(out).toContain('"a": "x"');
      expect(out).toContain('  "b"');
      expect(out).toContain('    "c": "y"');
    });
  });
});
