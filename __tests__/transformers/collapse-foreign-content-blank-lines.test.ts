import { collapseForeignContentBlankLines } from '../../processor/transform/mdxish/collapse-foreign-content-blank-lines';

describe('collapseForeignContentBlankLines', () => {
  it('drops blank lines between SVG children', () => {
    const input = `<svg viewBox="0 0 24 24">
  <rect x="4" y="4" />

  <path d="M9 9h6v6H9z" />
</svg>`;

    expect(collapseForeignContentBlankLines(input)).toBe(`<svg viewBox="0 0 24 24">
  <rect x="4" y="4" />
  <path d="M9 9h6v6H9z" />
</svg>`);
  });

  it('drops blank lines between MathML children', () => {
    const input = `<math>
  <mrow>
    <mi>x</mi>

    <mo>=</mo>

    <mn>1</mn>
  </mrow>
</math>`;

    expect(collapseForeignContentBlankLines(input)).toBe(`<math>
  <mrow>
    <mi>x</mi>
    <mo>=</mo>
    <mn>1</mn>
  </mrow>
</math>`);
  });

  it('leaves blank lines outside the island untouched', () => {
    const input = `<div>

  text

  <svg viewBox="0 0 24 24">
    <path d="a" />

    <path d="b" />
  </svg>

  more text

</div>`;

    expect(collapseForeignContentBlankLines(input)).toBe(`<div>

  text

  <svg viewBox="0 0 24 24">
    <path d="a" />
    <path d="b" />
  </svg>

  more text

</div>`);
  });

  it('handles nested <svg> via depth tracking', () => {
    const input = `<svg viewBox="0 0 24 24">
  <svg x="2">
    <path d="a" />

    <path d="b" />
  </svg>

  <path d="c" />
</svg>`;

    expect(collapseForeignContentBlankLines(input)).toBe(`<svg viewBox="0 0 24 24">
  <svg x="2">
    <path d="a" />
    <path d="b" />
  </svg>
  <path d="c" />
</svg>`);
  });

  it('does not swallow document blank lines after a self-closing <svg/>', () => {
    const input = `<svg viewBox="0 0 24 24" />

paragraph one

paragraph two`;

    // A self-closing SVG never opens a block, so nothing collapses.
    expect(collapseForeignContentBlankLines(input)).toBe(input);
  });

  it('does not swallow document blank lines after a multi-line self-closing <svg/>', () => {
    // A self-closing tag whose `/>` wraps onto a later line (common Prettier
    // output) must still open no island — otherwise its depth latches and eats
    // every downstream blank line (#1545 regression).
    const input = `<svg viewBox="0 0 24 24"
  fill="none" />

paragraph one

paragraph two`;

    expect(collapseForeignContentBlankLines(input)).toBe(input);
  });

  it('does not swallow document blank lines after a fully-expanded self-closing <svg/>', () => {
    const input = `<svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  viewBox="0 0 24 24"
/>

paragraph one

paragraph two`;

    expect(collapseForeignContentBlankLines(input)).toBe(input);
  });

  it('does not swallow document blank lines after a multi-line self-closing <math/>', () => {
    const input = `<math
  display="block"
/>

paragraph one

paragraph two`;

    expect(collapseForeignContentBlankLines(input)).toBe(input);
  });

  it('does not swallow document blank lines after a self-closing <svg/> with a quoted ">"', () => {
    // The `>` lives inside a quoted attribute value, so it must not be read as the tag
    // terminator — otherwise the `/>` is missed, the tag latches as an unclosed opener,
    // and every downstream blank line is eaten.
    const input = `<svg data-tooltip="a > b" viewBox="0 0 24 24" />

paragraph one

paragraph two`;

    expect(collapseForeignContentBlankLines(input)).toBe(input);
  });

  it('collapses blank lines inside an SVG with a multi-line opening tag', () => {
    const input = `<svg
  viewBox="0 0 24 24"
>
  <path d="a" />

  <path d="b" />
</svg>`;

    expect(collapseForeignContentBlankLines(input)).toBe(`<svg
  viewBox="0 0 24 24"
>
  <path d="a" />
  <path d="b" />
</svg>`);
  });

  it('ignores foreign-content markup inside fenced code blocks', () => {
    const input = `\`\`\`html
<svg>
  <path d="a" />

  <path d="b" />
</svg>
\`\`\``;

    expect(collapseForeignContentBlankLines(input)).toBe(input);
  });

  it('does not treat a hyphenated custom element like <svg-icon> as foreign content', () => {
    const input = `<svg-icon>

paragraph one

paragraph two

</svg-icon>`;

    // A custom element is not SVG/MathML, so its blank lines must survive.
    expect(collapseForeignContentBlankLines(input)).toBe(input);
  });

  it('ignores an unmatched foreign tag inside an HTML comment', () => {
    const input = `<!-- <math> -->

paragraph one

paragraph two`;

    // A stray tag in a comment must not open an island and eat downstream blank lines.
    expect(collapseForeignContentBlankLines(input)).toBe(input);
  });

  it('returns content unchanged when there is no SVG/MathML', () => {
    const input = `<div>

  hello

</div>`;
    expect(collapseForeignContentBlankLines(input)).toBe(input);
  });
});
