import { terminateHtmlFlowBlocks } from '../../processor/transform/mdxish/terminate-html-flow-blocks';

describe('terminateHtmlFlowBlocks', () => {
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

  it('does not modify content when blank line already exists', () => {
    const input = `<div></div>

Some text`;

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

  it('does not insert blank line after last line', () => {
    const input = '<div></div>';

    expect(terminateHtmlFlowBlocks(input)).toBe(input);
  });

  it('does not modify indented HTML lines (JSX children)', () => {
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

  it('does not modify indented closing tags inside components', () => {
    const input = `  </th>
  <td>next cell</td>`;

    expect(terminateHtmlFlowBlocks(input)).toBe(input);
  });

  it('handles HTML with attributes', () => {
    const input = `<div class="wrapper">
Next content`;

    const result = terminateHtmlFlowBlocks(input);
    expect(result).toBe(`<div class="wrapper">

Next content`);
  });

  it('inserts blank line when HTML tags contain text content', () => {
    const input = `<div><p>Some text here</p></div>
[block:callout]
{
  "type": "success",
  "body": "Hello"
}
[/block]`;

    const result = terminateHtmlFlowBlocks(input);
    expect(result).toBe(`<div><p>Some text here</p></div>

[block:callout]
{
  "type": "success",
  "body": "Hello"
}
[/block]`);
  });

  it('inserts blank line when HTML line has text after closing tag', () => {
    const input = `<div><p>Text inside</p></div>Text after
[block:callout]
{
  "type": "success",
  "body": "Hello"
}
[/block]`;

    const result = terminateHtmlFlowBlocks(input);
    expect(result).toBe(`<div><p>Text inside</p></div>Text after

[block:callout]
{
  "type": "success",
  "body": "Hello"
}
[/block]`);
  });

  it('inserts blank line when HTML line has text in both positions', () => {
    const input = `<div><p>Inner text</p></div>Outer text
# Heading after`;

    const result = terminateHtmlFlowBlocks(input);
    expect(result).toBe(`<div><p>Inner text</p></div>Outer text

# Heading after`);
  });

  it('does not modify HTML line with content when blank line already exists', () => {
    const input = `<div><p>Text</p></div>More text

Some content`;

    expect(terminateHtmlFlowBlocks(input)).toBe(input);
  });

  it('does not modify indented HTML line with content', () => {
    const input = `  <div><p>Text</p></div>
Next line`;

    expect(terminateHtmlFlowBlocks(input)).toBe(input);
  });

  it('does not catastrophically backtrack on tags with many spaces', () => {
    const input = `<a${' '.repeat(1000)}>
Next line`;

    const start = performance.now();
    const result = terminateHtmlFlowBlocks(input);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(100);
    expect(result).toContain('\n\nNext line');
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
    expect(result).toContain('\n\nNext line');
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
});
