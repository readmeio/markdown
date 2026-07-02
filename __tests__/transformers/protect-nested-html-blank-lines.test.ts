import { protectNestedHtmlBlankLines } from '../../processor/transform/mdxish/protect-nested-html-blank-lines';

describe('protectNestedHtmlBlankLines', () => {
  it('replaces a blank line between JSX sibling tags inside a plain block tag', () => {
    const input = `<div className="wrap">
  <div className="a">
    <p>one</p>
  </div>

  <div className="b">
    <p>two</p>
  </div>
</div>`;

    const result = protectNestedHtmlBlankLines(input);

    expect(result).not.toContain('\n\n');
    expect(result).toContain('  <!---->');
  });

  it('leaves blank lines alone outside of any block tag', () => {
    const input = `Some text.

More text.`;

    expect(protectNestedHtmlBlankLines(input)).toBe(input);
  });

  it('deletes (rather than replaces) a blank line inside an open brace expression, since inserting text there would corrupt the JS on eval', () => {
    const input = `<div className="grid">
  {[1, 2].map((item) => {
    const x = item;

    return x;
  })}
</div>`;

    const result = protectNestedHtmlBlankLines(input);

    expect(result).toBe(`<div className="grid">
  {[1, 2].map((item) => {
    const x = item;
    return x;
  })}
</div>`);
    expect(result).not.toContain('<!---->');
  });

  it('does not touch blank lines inside table structural tags', () => {
    const input = `<table>
<tr>
<td>

<p>cell</p>

</td>
</tr>
</table>`;

    expect(protectNestedHtmlBlankLines(input)).toBe(input);
  });

  it('does not touch blank lines inside <HTMLBlock> payloads', () => {
    const input = `<HTMLBlock>{\`
<div>
<span>one</span>

<span>two</span>
</div>
\`}</HTMLBlock>`;

    expect(protectNestedHtmlBlankLines(input)).toBe(input);
  });

  it('matches the indentation of the following line so downstream dedent logic is unaffected', () => {
    const input = `<div className="wrap">
  <p>one</p>

  <p>two</p>
</div>`;

    const result = protectNestedHtmlBlankLines(input);
    expect(result).toContain('  <!---->');
  });

  it('protects a blank line even when the wrapper tag shares its line with other content', () => {
    const input = `<div className="wrap"><span>a</span>

<span>b</span></div>`;

    const result = protectNestedHtmlBlankLines(input);

    expect(result).not.toContain('\n\n');
    expect(result).toContain('<!---->');
  });

  it('does not desync brace depth when a string literal contains a stray brace', () => {
    const input = `<div className="grid">
  {(() => {
    const s = "}}";
    return 1;

    return 2;
  })()}
</div>`;

    const result = protectNestedHtmlBlankLines(input);

    expect(result).not.toContain('\n\n');
  });
});
