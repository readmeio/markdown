import { mdxish, mix } from '../../../lib';
import { findAllElementsByTagName, roundTripMdxish } from '../../helpers';

// Shape lifted from a real OpenAPI `description`: prose soft-wrapped to a line-length
// limit, paragraphs separated by a blank line, and a single trailing space left on most
// lines (two would be an intentional markdown hard break; one is a wrap artifact).
const SOFT_WRAPPED = (
  [
    'Enrich Contacts can be used to retrieve detailed information about up to 25 records. ',
    'Best practice is to first use Search Contacts to identify the records you want to ',
    'enrich, and then use the Contact IDs as the input.',
    '',
    'Once you have indicated which records you want to enrich, you must then select which ',
    'fields you want to return using the `outputFields` list.',
  ] as const
).join('\n');

/** A cell whose html element spans several lines, with a blank line between its items. */
const HTML_CELL =
  '[block:parameters]{"data":{"h-0":"Col","0-0":"<ul>\\n  <li>one</li>\\n\\n  <li>two</li>\\n</ul>"},"cols":1,"rows":1}[/block]';
const TABLE_OPEN = '<table><thead><tr><th align="left">Col</th></tr></thead><tbody><tr><td align="left">';
const TABLE_CLOSE = '</td></tr></tbody></table>';

describe('hardBreaks', () => {
  it('breaks on every newline by default, matching legacy rdmd', () => {
    const ast = mdxish(SOFT_WRAPPED);

    expect(findAllElementsByTagName(ast, 'br')).toHaveLength(3);
    expect(findAllElementsByTagName(ast, 'p')).toHaveLength(2);
  });

  it('leaves soft-wrapped lines joined when disabled', () => {
    const ast = mdxish(SOFT_WRAPPED, { hardBreaks: false });

    expect(findAllElementsByTagName(ast, 'br')).toHaveLength(0);
    expect(findAllElementsByTagName(ast, 'p')).toHaveLength(2);
  });

  it('still splits paragraphs on a blank line when disabled', () => {
    const ast = mdxish('First para.\n\nSecond para.', { hardBreaks: false });

    expect(findAllElementsByTagName(ast, 'p')).toHaveLength(2);
    expect(findAllElementsByTagName(ast, 'br')).toHaveLength(0);
  });

  it.each([
    ['a <br /> tag', 'Line one<br />Line two'],
    ['two trailing spaces', 'Line one  \nLine two'],
    ['a trailing backslash', 'Line one\\\nLine two'],
  ])('keeps a break the author wrote out with %s when disabled', (_name, md) => {
    const ast = mdxish(md, { hardBreaks: false });

    expect(findAllElementsByTagName(ast, 'br')).toHaveLength(1);
  });

  // The plugin leaves standalone carriage returns alone (#1555), so only the LF breaks.
  describe('carriage returns', () => {
    it('breaks a CRLF once', () => {
      expect(mix('line one\r\nline two')).toBe('<p>line one<br>\nline two</p>');
    });

    it('leaves a CRLF joined when disabled', () => {
      expect(mix('line one\r\nline two', { hardBreaks: false })).toBe('<p>line one\r\nline two</p>');
    });

    it.each([[true], [false]])('never breaks a standalone carriage return (hardBreaks: %s)', hardBreaks => {
      expect(mix('line one\rline two', { hardBreaks })).toBe('<p>line one\rline two</p>');
    });
  });

  describe('applies line break option inside readme components', () => {
    it('in callout', () => {
      const md = `<Callout type="info" title="Note">
  line one
  line two
</Callout>
      `;
      const ast = mdxish(md, { hardBreaks: false });
      expect(findAllElementsByTagName(ast, 'br')).toHaveLength(0);
    });

    it('in tables', () => {
      const md = `<Table>
          <thead>
            <tr>
              <th>
                Name
              </th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>
                line one
                line two
              </td>
            </tr>
          </tbody>
        </Table>
      `;
      const ast = mdxish(md, { hardBreaks: false });

      const tableCell = findAllElementsByTagName(ast, 'td')[0];
      expect(findAllElementsByTagName(tableCell, 'br')).toHaveLength(0);
    });
  });

  it('does not affect line breaks in code blocks', () => {
    const md = '```javascript\nline one\nline two\n```';
    const ast = mdxish(md, { hardBreaks: false });
    const code = findAllElementsByTagName(ast, 'code')[0];

    expect(code.properties.value).toBe('line one\nline two');
  });

  // HTMLBlocks are left & opaque and no custom processing is applied to their content,
  // so the option should not affect them.
  it('does not affect line breaks in HTMLBlock', () => {
    const content = `<div>
line one
line two
</div>`;
    const md = `<HTMLBlock>{\`${content}\`}</HTMLBlock>`;

    const withHardBreaks = mdxish(md);
    const withoutHardBreaks = mdxish(md, { hardBreaks: false });

    expect(findAllElementsByTagName(withHardBreaks, 'html-block')[0].properties.html).toBe(content);
    expect(findAllElementsByTagName(withoutHardBreaks, 'html-block')[0].properties.html).toBe(content);
  });

  // Magic blocks write some newlines out as literal `<br>` markup, which the plugin can't reach.
  describe('in magic blocks', () => {
    it.each([
      ['callout', '[block:callout]{"type":"info","title":"Note","body":"line one\\nline two<br />line three"}[/block]'],
      [
        'parameters',
        '[block:parameters]{"data":{"h-0":"Col","0-0":"line one\\nline two<br />line three"},"cols":1,"rows":1}[/block]',
      ],
    ])('applies to a %s magic block body', (_name, md) => {
      const withHardBreaks = mdxish(md);
      const withoutHardBreaks = mdxish(md, { hardBreaks: false });

      expect(findAllElementsByTagName(withHardBreaks, 'br')).toHaveLength(2);
      expect(findAllElementsByTagName(withoutHardBreaks, 'br')).toHaveLength(1);
    });

    it('applies to newline inside html elements in a table cell', () => {
      const md =
        '[block:parameters]{"data":{"h-0":"Col","0-0":"<div>line one\\nline two</div>"},"cols":1,"rows":1}[/block]';
      const ast = mdxish(md, { hardBreaks: false });

      expect(findAllElementsByTagName(ast, 'br')).toHaveLength(0);
    });

    it('breaks every newline of a multi-line html element in a table cell', () => {
      expect(mix(HTML_CELL).trim()).toBe(
        `${TABLE_OPEN}<ul><br><li>one</li><br><br><li>two</li><br></ul>${TABLE_CLOSE}`,
      );
    });

    // The rewrite also stops CommonMark ending the html block on the blank line, so blank
    // lines must keep collapsing when single newlines no longer do — otherwise the list breaks apart.
    it('keeps a multi-line html element in a table cell intact when disabled', () => {
      expect(mix(HTML_CELL, { hardBreaks: false }).trim()).toBe(
        `${TABLE_OPEN}<ul>\n  <li>one</li><br><li>two</li></ul>${TABLE_CLOSE}`,
      );
    });

    it.each([
      [true, `${TABLE_OPEN}<div>one</div><br><p>trailing</p>${TABLE_CLOSE}`],
      [false, `${TABLE_OPEN}<div>one</div><p>trailing</p>${TABLE_CLOSE}`],
    ])('applies to the newline after a closing block tag in a table cell (hardBreaks: %s)', (hardBreaks, expected) => {
      const md = '[block:parameters]{"data":{"h-0":"Col","0-0":"<div>one</div>\\ntrailing"},"cols":1,"rows":1}[/block]';

      expect(mix(md, { hardBreaks }).trim()).toBe(expected);
    });

    it.each([
      [true, '<p><br><br>line one</p>'],
      [false, '<p>line one</p>'],
    ])('applies to leading newlines in a body (hardBreaks: %s)', (hardBreaks, expected) => {
      const md = '[block:callout]{"type":"info","body":"\\n\\nline one"}[/block]';

      expect(mix(md, { hardBreaks })).toContain(expected);
    });
  });

  // The editor consumes the MDAST from `mdxishAstProcessor`, which never hard-breaks, so
  // newlines round-trip as newlines rather than as an escaped hard break.
  // We can revisit if this is a problem.
  it.each([[true], [false]])('round-trips a magic block body unbroken (hardBreaks: %s)', hardBreaks => {
    const md = '[block:callout]{"type":"info","body":"line one\\nline two"}[/block]';

    expect(roundTripMdxish(md, { hardBreaks })).toBe(
      '<Callout icon="📘" theme="info" type="info" empty={true}>\n  ###\n\n  line one\n  line two\n</Callout>\n',
    );
  });
});
