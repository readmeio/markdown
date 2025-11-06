import { stripComments } from '../index';

describe('Strip Comments', () => {
  it('removes HTML comments from the text', () => {
    const input = `
# hello world
This is some text.
<!-- This is a comment that should be removed -->
More text here.
<!-- Another comment -->`;

    const expectedOutput = `
This is some text.
More text here.`;

    expect(stripComments(input)).toBe(expectedOutput);
  });
});
