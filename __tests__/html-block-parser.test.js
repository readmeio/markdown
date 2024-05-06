import { mdast } from '../index';

describe.skip('Parse html block', () => {
  it('parses an html block', () => {
    const text = `
<div>Some block html</div>
    `;

    expect(mdast(text)).toMatchSnapshot();
  });
});
