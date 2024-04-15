import { mdast } from '../../index';

describe('Parse magic block tables', () => {
  it('renders an table with missing cells', () => {
    const text = `
[block:parameters]
${JSON.stringify(
  {
    data: {
      'h-1': 'Header 1',
      '0-0': 'Cell A 1',
    },
    cols: 2,
    rows: 2,
  },
  null,
  2
)}
[/block]
    `;

    expect(mdast(text)).toMatchSnapshot();
  });
});
