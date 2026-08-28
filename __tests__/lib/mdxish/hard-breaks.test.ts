import { mdxish } from '../../../lib';
import { findAllElementsByTagName } from '../../helpers';

// Shape lifted from a real OpenAPI `description`: prose soft-wrapped to a line-length
// limit, paragraphs separated by a blank line, and a single trailing space left on most
// lines (two would be an intentional markdown hard break; one is a wrap artifact).
const SOFT_WRAPPED = [
  'Enrich Contacts can be used to retrieve detailed information about up to 25 records. ',
  'Best practice is to first use Search Contacts to identify the records you want to ',
  'enrich, and then use the Contact IDs as the input.',
  '',
  'Once you have indicated which records you want to enrich, you must then select which ',
  'fields you want to return using the `outputFields` list.',
].join('\n');

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
});
