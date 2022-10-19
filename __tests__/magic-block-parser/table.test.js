const rehypeSanitize = require('rehype-sanitize');
const remarkParse = require('remark-parse');
const unified = require('unified');

const options = require('../../options').options.markdownOptions;
const parser = require('../../processor/parse/magic-block-parser');

const sanitize = { attributes: [] };
const process = (text, opts = options) =>
  text &&
  unified()
    .use(remarkParse, opts)
    .data('settings', { position: false })
    .use(parser.sanitize(sanitize))
    .use(rehypeSanitize)
    .parse(text);

describe('Table Blocks', () => {
  it('does not display data outside the declared dimensions', () => {
    const text = `[block:parameters]
    {
      "data": {
        "h-0": "Left",
        "h-1": "Center",
        "h-2": "Right",
        "0-0": "Left 0",
        "0-1": "Center 0",
        "0-2": "Right 0",
        "1-0": "Left 1",
        "1-1": "Center 1",
        "1-2": "Right 1",
        "2-0": "Left 2",
        "2-1": "Center 2",
        "2-2": "Right 2"
      },
      "cols": 2,
      "rows": 2
    }
    [/block]`;

    expect(process(text)).toMatchSnapshot();
  });
});
