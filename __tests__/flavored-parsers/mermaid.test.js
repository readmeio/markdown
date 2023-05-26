import { MERMAID_BLOCK_LANG } from '../../constants';
import { mdast } from '../../index';

describe('Parse Mermaid blocks', () => {
  it('parses a mermaid block', () => {
    const doc = `
~~~${MERMAID_BLOCK_LANG}
graph LR
    A[Will it blend?] --> B[Yes]
~~~
`;

    expect(mdast(doc)).toMatchSnapshot();
  });
});
