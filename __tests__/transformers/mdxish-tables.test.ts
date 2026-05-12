import type { Node, Root } from 'mdast';

import { toHtml } from 'hast-util-to-html';

import { mdxish, mdxishAstProcessor } from '../../lib/mdxish';
import { collectNodes } from '../helpers';

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

  describe('given raw/unclosed HTML inside cells', () => {
    // Unclosed void elements, unclosed pairs, and unknown lowercase tags
    // would otherwise crash remarkMdx and force the fallback path, which
    // shreds the table structure. The HTML normalizer should fix the cell
    // contents so MDX parsing succeeds and the <Table> stays intact.
    it('parses unclosed void elements (<br>, <img>) inside a <Table>', () => {
      const md = `<Table>
<thead>
<tr><th>Header</th></tr>
</thead>
<tbody>
<tr><td>line1<br>line2 with <img src="x.png"></td></tr>
</tbody>
</Table>`;
      const html = toHtml(mdxish(md));

      expect(html).toContain('<table');
      expect(html).toContain('<br');
      expect(html).toContain('<img');
      expect(html).toContain('src="x.png"');
    });

    it('auto-closes unclosed non-void tags inside a <Table> cell', () => {
      const md = `<Table>
<thead>
<tr><th>Header</th></tr>
</thead>
<tbody>
<tr><td><p>hi <a href="z">link</td></tr>
</tbody>
</Table>`;
      const html = toHtml(mdxish(md));

      expect(html).toContain('<table');
      expect(html).toContain('hi');
      expect(html).toContain('link');
      expect(html).toContain('href="z"');
    });

    it('keeps an uppercase JSX component intact when normalizing sibling raw HTML', () => {
      const md = `<Table>
<thead>
<tr><th>Header</th></tr>
</thead>
<tbody>
<tr><td><Image src="a.png" /> before <br> after</td></tr>
</tbody>
</Table>`;
      const ast = astProcessor(md);
      const jsxElements = collectNodes(ast, 'mdxJsxTextElement') as (Node & { name?: string })[];
      const image = jsxElements.find(n => n.name === 'Image');

      expect(image).toBeDefined();
      expect(image!.type).toBe('mdxJsxTextElement');
    });

    it('doesnt break table when there are empty lines inside the table', () => {
      const md = `<Table align={["left","left"]}>
  <thead>
    <tr>
      <th>
        Parameter
      </th>

      <th>
        Parameter 2
      </th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td>
        Specifies the tracking and click-through URLs for each supported ad unit

        **_Note:_**_&#x20;To ensure complete ad delivery on all ad units, ensure that clickUrl\\* is provided for all ad units (marquee, skyline, gallery, brandbox, tile ) while associating a creative._<br />**The urlTracker objects are detailed** <p><a href="#C4">**here**</a></p>
      </td>

      <td>
        Array <string>
      </td>
    </tr>

    <tr>
      <td>
        asa
      </td>

      <td>

      </td>
    </tr>
  </tbody>
</Table>`;
      const ast = astProcessor(md);
      const tableNode = collectNodes(ast, 'table');
      expect(tableNode).toHaveLength(1);
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
});
