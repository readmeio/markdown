import { h } from 'hastscript';

import { hast } from '../../lib';

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
      h('h2', { id: 'test' }, 'Test'),
      '\n',
      h('h2', { id: 'its-coming-from-within-the-component' }, "It's coming from within the component!"),
    );

    // @ts-expect-error - the custom matcher types are not being set up
    // correctly
    expect(hast(md, { components })).toStrictEqualExceptPosition(expected);
  });
});
