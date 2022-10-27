import { mdast } from '../index';

describe('Parse html block', () => {
  it('parses an html block', () => {
    const text = `
<div>Some block html</div>
    `;

    expect(mdast(text)).toMatchSnapshot();
  });
});
