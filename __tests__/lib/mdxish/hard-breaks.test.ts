import { mdxish } from '../../../lib';
import { findAllElementsByTagName } from '../../helpers';

// Shape lifted from a real OpenAPI `description`: prose soft-wrapped to a line-length
// limit, paragraphs separated by a blank line, and a single trailing space left on most
// lines (two would be an intentional markdown hard break; one is a wrap artifact).
const SOFT_WRAPPED = ([
  'Enrich Contacts can be used to retrieve detailed information about up to 25 records. ',
  'Best practice is to first use Search Contacts to identify the records you want to ',
  'enrich, and then use the Contact IDs as the input.',
  '',
  'Once you have indicated which records you want to enrich, you must then select which ',
  'fields you want to return using the `outputFields` list.',
] as const).join('\n');

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

  it('keeps a break the author wrote out when disabled', () => {
    const ast = mdxish('Line one<br />Line two', { hardBreaks: false });

    expect(findAllElementsByTagName(ast, 'br')).toHaveLength(1);
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

  // Magic block bodies are parsed by their own processor, so the option has to reach it too.
  describe('in magic blocks', () => {
    it.each([
      ['callout', '[block:callout]{"type":"info","title":"Note","body":"line one\\nline two<br />line three"}[/block]'],
      ['parameters', '[block:parameters]{"data":{"h-0":"Col","0-0":"line one\\nline two<br />line three"},"cols":1,"rows":1}[/block]'],
    ])('applies to a %s magic block body', (_name, md) => {
      const withHardBreaks = mdxish(md);
      const withoutHardBreaks = mdxish(md, { hardBreaks: false });

      expect(findAllElementsByTagName(withHardBreaks, 'br')).toHaveLength(2);
      expect(findAllElementsByTagName(withoutHardBreaks, 'br')).toHaveLength(1);
    });

    it('applies to newline inside html elements in a table cell', () => {
      const md = '[block:parameters]{"data":{"h-0":"Col","0-0":"<div>line one\\nline two</div>"},"cols":1,"rows":1}[/block]';
      const ast = mdxish(md, { hardBreaks: false });

      expect(findAllElementsByTagName(ast, 'br')).toHaveLength(0);
    });
  });
});
