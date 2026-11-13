import { terminateHtmlFlowBlocks } from '../../processor/transform/mdxish/terminate-html-flow-blocks';

describe('terminateHtmlFlowBlocks', () => {
  describe('when it should insert a blank line', () => {
    it('inserts blank line between standalone HTML and magic block', () => {
      const input = `<div><p></p></div>
[block:callout]
{
  "type": "success",
  "body": "Hello"
}
[/block]`;

      const result = terminateHtmlFlowBlocks(input);
      expect(result).toBe(`<div><p></p></div>

[block:callout]
{
  "type": "success",
  "body": "Hello"
}
[/block]`);
    });

    it('inserts blank line after opening HTML tag when the next line is not an HTML construct and inside an HTML tree', () => {
      const input = `<div>
[block:callout]
{
  "type": "success",
  "body": "Hello"
}
[/block]
</div>
      `;

      const result = terminateHtmlFlowBlocks(input);
      expect(result).toBe(`<div>

[block:callout]
{
  "type": "success",
  "body": "Hello"
}
[/block]
</div>
      `);
    });

    it('inserts blank line between self-closing HTML tag and following content', () => {
      const input = `<br />
Some text after`;

      const result = terminateHtmlFlowBlocks(input);
      expect(result).toBe(`<br />

Some text after`);
    });

    it('inserts blank line between HTML tag and a heading', () => {
      const input = `<div></div>
# Heading`;

      const result = terminateHtmlFlowBlocks(input);
      expect(result).toBe(`<div></div>

# Heading`);
    });

    it('inserts blank line between HTML tag and a paragraph', () => {
      const input = `</section>
Some paragraph text here.`;

      const result = terminateHtmlFlowBlocks(input);
      expect(result).toBe(`</section>

Some paragraph text here.`);
    });

    it('handles multiple standalone HTML blocks followed by content', () => {
      const input = `<div></div>
[block:callout]
{"type":"info","body":"First"}
[/block]
<section></section>
# Next section`;

      const result = terminateHtmlFlowBlocks(input);
      expect(result).toContain('<div></div>\n\n[block:callout]');
      expect(result).toContain('</section>\n\n# Next section');
    });

    it('handles HTML with attributes', () => {
      const input = `<div class="wrapper">
Next content`;

      const result = terminateHtmlFlowBlocks(input);
      expect(result).toBe(`<div class="wrapper">

Next content`);
    });

    it('inserts blank line after opening HTML tag when next line is a list', () => {
      const input = `<div>
- item one
- item two`;

      const result = terminateHtmlFlowBlocks(input);
      expect(result).toBe(`<div>

- item one
- item two`);
    });

    it('inserts blank line after opening HTML tag when next line is a blockquote', () => {
      const input = `<div>
> quoted text`;

      const result = terminateHtmlFlowBlocks(input);
      expect(result).toBe(`<div>

> quoted text`);
    });

    it('inserts blank line after opening HTML tag when next line is a fenced code block', () => {
      const input = `<div>
\`\`\`js
const x = 1;
\`\`\``;

      const result = terminateHtmlFlowBlocks(input);
      expect(result).toBe(`<div>

\`\`\`js
const x = 1;
\`\`\``);
    });

    it('inserts blank line after opening HTML tag when next line is an ordered list', () => {
      const input = `<div>
1. first
2. second`;

      const result = terminateHtmlFlowBlocks(input);
      expect(result).toBe(`<div>

1. first
2. second`);
    });

    it('inserts blank line after opening HTML tag when next line is a thematic break', () => {
      const input = `<div>
---`;

      const result = terminateHtmlFlowBlocks(input);
      expect(result).toBe(`<div>

---`);
    });

    it('inserts blank line after opening HTML tag when next line is a closing block marker', () => {
      const input = `<div>
[/block]`;

      const result = terminateHtmlFlowBlocks(input);
      expect(result).toBe(`<div>

[/block]`);
    });

    it('inserts blank line after a lone opening tag when the next line is markdown indented 1-3 columns', () => {
      const input = `<div className="simple-list">
  ## Learn By Example

  Use the [API Simulator](https://example.com) alongside guides.
</div>`;

      const result = terminateHtmlFlowBlocks(input);
      expect(result).toBe(`<div className="simple-list">

  ## Learn By Example

  Use the [API Simulator](https://example.com) alongside guides.
</div>`);
    });

    it('inserts blank line after an indented (1-3 columns) lone opening tag followed by markdown', () => {
      const input = `  <div>
text at column 0`;

      const result = terminateHtmlFlowBlocks(input);
      expect(result).toBe(`  <div>

text at column 0`);
    });

    // The next three shapes reach 4+ columns; indented code is disabled, so the
    // freed line parses as markdown rather than turning into a code block.
    it('inserts blank line before a tab-indented (4-column) markdown line', () => {
      const input = `<div>
\tTabbed line
</div>`;

      const result = terminateHtmlFlowBlocks(input);
      expect(result).toBe(`<div>

\tTabbed line
</div>`);
    });

    it('inserts blank line after a tab-indented lone opening tag followed by markdown', () => {
      const input = `\t<div>
text at column 0`;

      const result = terminateHtmlFlowBlocks(input);
      expect(result).toBe(`\t<div>

text at column 0`);
    });

    it('inserts blank line after a lone opening tag when the next line is markdown at 4+ columns', () => {
      const input = `<div>
      indented line
      with some text after

      should be freed as markdown
</div>
      `;

      const result = terminateHtmlFlowBlocks(input);
      expect(result).toBe(`<div>

      indented line
      with some text after

      should be freed as markdown
</div>
      `);
    });

    it('inserts blank line when HTML line has text content between and after tags', () => {
      const input = `<div><p>Inner text</p></div>Outer text
[block:callout]
{
  "type": "success",
  "body": "Hello"
}
[/block]`;

      const result = terminateHtmlFlowBlocks(input);
      expect(result).toBe(`<div><p>Inner text</p></div>Outer text

[block:callout]
{
  "type": "success",
  "body": "Hello"
}
[/block]`);
    });
  });

  // RM-16379: a type-6 opener with trailing text still opens an HTML block, which
  // swallows a markdown block on the next line.
  describe('block-level tag followed by text on the same line', () => {
    it.each([
      ['<li> test', '[block:parameters]'],
      ['<div class="x"> hi', '## Heading'],
      ['<div> hi', '#Compact heading'],
      // Prose starting with `#` is a compact heading in mdxish anyway (`normalizeCompactHeadings`).
      ['<li> Tags:', '#docs #api'],
      ['</li> text', '## Heading'],
      ['<li> test', '```js\ncode\n```'],
      ['<figure> intro', '[block:callout]\n{}\n[/block]\n</figure>'],
    ])('inserts blank line between %j and %j', (line, next) => {
      expect(terminateHtmlFlowBlocks(`${line}\n${next}`)).toBe(`${line}\n\n${next}`);
    });

    it.each([
      ['<b> bold text', '## Heading'],
      ['<your-api-key> replace this', '## Heading'],
      ['<https://example.com> is our docs', '## Heading'],
      ['<lit> test', '## Heading'],
      [' <li> test', '[block:parameters]'],
      // Legacy continuation lines stay inside the HTML block, as on `next`.
      ['<div> hi', '**bold**'],
      ['<li>Step one', 'more detail\n<li>Step two\n</ol>'],
      ['<p>Line one', '<br>Line two\n<br>Line three'],
      // Lists, blockquotes and rules still wouldn't render after the HTML block, so splitting gains nothing.
      ['<li> Range', '- 5 to 10 degrees'],
      ['<li> test', '1999. was a year'],
      ['<div> hi', '>= 5 items'],
      ['<div> Title text', '---\nmore'],
    ])('does not insert between %j and %j', (line, next) => {
      const input = `${line}\n${next}`;
      expect(terminateHtmlFlowBlocks(input)).toBe(input);
    });

    it.each([
      '<textarea>\n<p> Hello\n# world\n</textarea>',
      '<pre>\n<li> item\n- text\n</pre>',
      '<table>\n<tr>\n<td>\n<p> cell\n- text\n</td>\n</tr>\n</table>',
    ])('leaves raw-content and table payloads unchanged: %j', input => {
      expect(terminateHtmlFlowBlocks(input)).toBe(input);
    });

    // A balanced closer later in the same run means mdxish re-parses the whole block already.
    it.each([
      '<div>**bold**\nmore</div>',
      '<li> test\n[block:callout]\n{}\n[/block]\n</li>',
      '<div class="x"> hi\n## Heading\n</div>',
    ])('does not insert when the tag closes later in the same run: %j', input => {
      expect(terminateHtmlFlowBlocks(input)).toBe(input);
    });

    it('still inserts when the only closer is past a blank line', () => {
      expect(terminateHtmlFlowBlocks('<li> test\n## Heading\n\n</li>')).toBe('<li> test\n\n## Heading\n\n</li>');
    });

    // Only a balanced closer counts: htmlparser2 implicitly closes sibling `<li>`s.
    it.each([
      ['<li> First', '[block:callout]\n{}\n[/block]\n<li> Second</li>'],
      ['<div> outer', '## Heading\n<div>inner</div>'],
      ['<div> outer', '## Heading\n<span title="</div>">x</span>'],
    ])('inserts when a later closer belongs to another element: %j', (line, rest) => {
      expect(terminateHtmlFlowBlocks(`${line}\n${rest}`)).toBe(`${line}\n\n${rest}`);
    });

    it.each([
      '~~~html\n<li> test\nnext line\n~~~',
      '~~~\n<div>\nnext\n~~~',
      '~~~~~~\n<li> test\nnext\n~~~~~~',
      'Use `~~~` to open a tilde fence.\n\n```html\n<div>\nnext\n```',
    ])(
      'leaves fenced code unchanged: %j',
      input => {
        expect(terminateHtmlFlowBlocks(input)).toBe(input);
      },
    );
  });

  describe('when it should not insert a blank line', () => {
    it('does not modify content when blank line already exists after a closed HTML tag', () => {
      const input = `<div></div>

Some text`;

      expect(terminateHtmlFlowBlocks(input)).toBe(input);
    });

    it('does not add a blank line after an opening tag that already has a blank line after it', () => {
      const input = `<div>

Hello
</div>`;

      expect(terminateHtmlFlowBlocks(input)).toBe(input);
    });

    it('does not modify lines that do not end with an HTML tag', () => {
      const input = `Some text
[block:callout]
{
  "type": "info",
  "body": "Test"
}
[/block]`;

      expect(terminateHtmlFlowBlocks(input)).toBe(input);
    });

    it('does not insert blank line after last line', () => {
      const input = '<div></div>';

      expect(terminateHtmlFlowBlocks(input)).toBe(input);
    });

    it('does not insert for indented shapes when the current line has more than a lone opening tag', () => {
      const input = `  <div><span>x</span>
  text after`;

      expect(terminateHtmlFlowBlocks(input)).toBe(input);
    });

    it('does not insert after an opening tag when the indented next line opens a tag', () => {
      const input = `<div>
  <div
    style={{ display: "grid" }}
  >
  </div>
</div>`;

      expect(terminateHtmlFlowBlocks(input)).toBe(input);
    });

    it('does not insert after an opening tag when the indented next line opens an expression', () => {
      const input = `<div className="grid">
  {[1, 2].map(item => (
    <span>{item}</span>
  ))}
</div>`;

      expect(terminateHtmlFlowBlocks(input)).toBe(input);
    });

    it('does not insert for indented shapes inside a still-open raw-content element', () => {
      const input = `<pre>
<div>
  # verbatim, not a heading
</pre>`;

      expect(terminateHtmlFlowBlocks(input)).toBe(input);
    });

    it('does not modify non-indented HTML lines inside a JSX component', () => {
      const input = `<Table>

<thead>
  <tr>
    <th>Header</th>
  </tr>
</thead>
<tbody>
  <tr>
    <td>Cell</td>
  </tr>
</tbody>

</Table>`;

      expect(terminateHtmlFlowBlocks(input)).toBe(input);
    });

    it('does not modify the children of a JSX component', () => {
      const input = `<ExampleComponent>
hello
there
</ExampleComponent>`;

      expect(terminateHtmlFlowBlocks(input)).toBe(input);
    });

    it('does not modify indented HTML lines', () => {
      const input = `<table>
<thead>
  <tr>
    <th>Header</th>
  </tr>
</thead>
<tbody>
  <tr>
    <td>Cell</td>
  </tr>
</tbody>
</table>`;

      expect(terminateHtmlFlowBlocks(input)).toBe(input);
    });

    it('does not modify unindented HTML lines inside a JSX component', () => {
      const input = `<div>
<a href="#">Link 1</a>
<a href="#">Link 2</a>
</div>
      `;

      expect(terminateHtmlFlowBlocks(input)).toBe(input);
    });

    it('does not modify indented closing tags inside components', () => {
      const input = `  </th>
  <td>next cell</td>`;

      expect(terminateHtmlFlowBlocks(input)).toBe(input);
    });

    it('does not insert blank line after nested table opening tags when next line is plain content', () => {
      const input = `<table><tr><td>
Cell content stays put`;

      expect(terminateHtmlFlowBlocks(input)).toBe(input);
    });

    it.each([
      'pre',
      'script',
      'style',
      'textarea',
      'table',
      'thead',
      'tbody',
      'tfoot',
      'tr',
      'td',
      'th',
      'caption',
      'colgroup',
    ])('does not insert blank line after an unclosed <%s> opener with plain content', tag => {
      const input = `<${tag}>\nplain content stays put`;
      expect(terminateHtmlFlowBlocks(input)).toBe(input);
    });

    it('does not modify HTML inside fenced code blocks but still terminates HTML outside them', () => {
      const input = `\`\`\`html
<div></div>
\`\`\`
<section></section>
Some text
\`\`\`
<p></p>
\`\`\``;

      const result = terminateHtmlFlowBlocks(input);
      expect(result).toBe(`\`\`\`html
<div></div>
\`\`\`
<section></section>

Some text
\`\`\`
<p></p>
\`\`\``);
    });
  });

  describe('CommonMark type-1 HTML openers (<pre>, <script>, <style>, <textarea>)', () => {
    it('does not insert blank line after a <pre> opener with attributes', () => {
      const input = `<pre data-lang="json">
{
  "conditionOperator": "AND"
}
</pre>`;

      expect(terminateHtmlFlowBlocks(input)).toBe(input);
    });

    it('does not insert blank line after <pre> opener even when next line looks like a heading', () => {
      const input = `<pre>
# this is preformatted, not a heading
</pre>`;

      expect(terminateHtmlFlowBlocks(input)).toBe(input);
    });

    it('still inserts for column-0 pairs inside a still-open raw-content element', () => {
      // Locks in the col-0 asymmetry: only the line's own unclosed opener blocks
      // insertion at column 0 — cumulative tracking is deliberately not consulted,
      // so one unclosed <pre>/<table> typo can't poison the rest of the document.
      const input = `<pre>
<div>
# consumed by the still-open pre
</pre>`;

      expect(terminateHtmlFlowBlocks(input)).toBe(`<pre>
<div>

# consumed by the still-open pre
</pre>`);
    });

    it('does not insert blank line after <pre> opener even when next line looks like a magic block', () => {
      const input = `<pre>
[block:callout]
{"type":"info","body":"verbatim"}
[/block]
</pre>`;

      expect(terminateHtmlFlowBlocks(input)).toBe(input);
    });

    it('treats self-closed <pre /> as closed', () => {
      const input = `<pre />
# Heading`;

      expect(terminateHtmlFlowBlocks(input)).toBe('<pre />\n\n# Heading');
    });

    it('does not treat lookalike tags (<script-foo>) as a raw-content opener', () => {
      expect(terminateHtmlFlowBlocks('<script-foo>\n# heading')).toBe('<script-foo>\n\n# heading');
    });
  });

  describe('performance tests', () => {
    it('checks tag balance in linear time across a long unblanked legacy list', () => {
      // Each `<li>` sits above a heading, so every one triggers the balance walk.
      const list = (items: number) =>
        `${Array.from({ length: items }, (_, i) => `<li> item ${i}\n## Heading ${i}`).join('\n')}\n</li>`;
      const fastest = (md: string) =>
        Math.min(
          ...Array.from({ length: 3 }, () => {
            const start = performance.now();
            terminateHtmlFlowBlocks(md);
            return performance.now() - start;
          }),
        );

      // 8x the input; a per-line rescan would be ~64x slower.
      expect(fastest(list(4000)) / Math.max(fastest(list(500)), 1)).toBeLessThan(20);
    });

    it('does not catastrophically backtrack on tags with many spaces', () => {
      const input = `<a${' '.repeat(1000)}>
Next line`;

      const start = performance.now();
      const result = terminateHtmlFlowBlocks(input);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(100);
      expect(result).toContain('\nNext line');
    });

    it('does not catastrophically backtrack on malformed tags with spaces', () => {
      const input = `<a${' '.repeat(1000)}`;

      const start = performance.now();
      terminateHtmlFlowBlocks(input);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(100);
    });

    it('does not catastrophically backtrack on repeated tags with spaces', () => {
      const input = `${'<a >'.repeat(200)}
Next line`;

      const start = performance.now();
      const result = terminateHtmlFlowBlocks(input);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(100);
      expect(result).toContain('\nNext line');
    });

    it('does not catastrophically backtrack on tag names with many hyphens', () => {
      const input = `<a${'-'.repeat(1000)}`;

      const start = performance.now();
      terminateHtmlFlowBlocks(input);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(100);
    });

    it('does not catastrophically backtrack on repeated self-closing tags', () => {
      const input = `${'<a/>'.repeat(500)}`;

      const start = performance.now();
      terminateHtmlFlowBlocks(input);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(100);
    });

    it('does not catastrophically backtrack HTML that has many unindented lines', () => {
      const input = `<div>
${'<div>\nhello\n</div>\n'.repeat(1000)}
</div>
`;

      const start = performance.now();
      terminateHtmlFlowBlocks(input);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(100);
    });
  });
});
