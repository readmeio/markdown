import { stripComments } from '../../lib';

describe('removeComments', () => {
  it('removes HTML comments', async () => {
    const input = `
# Title

Some text.

<!-- This is a comment that should be removed -->

More text.
    
<!-- <p>This is another comment
that should be removed</p> -->
    `;

    const expectedOutput = `
# Title

Some text.

More text.
    `;

    const output = await stripComments(input);
    expect(output.trim()).toBe(expectedOutput.trim());
  });

  it('removes MDX comments', async () => {
    const input = `
# Title

Some text.

{/* This is an MDX comment that should be removed */}

More text.

{/**
 * Another MDX comment style that should be removed
 */}
    `;

    const expectedOutput = `
# Title

Some text.

More text.
    `;

    const output = await stripComments(input, { mdx: true });
    expect(output.trim()).toBe(expectedOutput.trim());
  });
});
