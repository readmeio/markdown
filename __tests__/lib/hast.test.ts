import { hast } from '../../lib';
import { h } from 'hastscript';

describe('hast transformer', () => {
  it('parses components into the tree', () => {
    const md = `
## Test

<Example />
    `;
    const components = {
      Example: "## It's coming from within the component!",
    };

    const expected = h(
      undefined,
      h('h2', undefined, 'Test'),
      '\n',
      h('h2', undefined, "It's coming from within the component!"),
    );

    expect(hast(md, { components })).toStrictEqualExceptPosition(expected);
  });
});
