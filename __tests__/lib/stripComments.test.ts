import { stripComments } from '../../lib';

describe('removeComments', () => {
  it('removes HTML comments', async () => {
    const input = `
# Title

<br /><!-- This is a comment. -->

Some text.<!-- This is a comment. -->

<p>Another text.<!-- This is a comment. --></p>

<!-- This is a comment. -->

More text.

\`<!-- This is a code block comment. -->\`
    
<!-- <p>This is a
comment</p> -->
    `;

    const expectedOutput = `
# Title

<br />

Some text.

<p>Another text.</p>

More text.

\`<!-- This is a code block comment. -->\`
    `;

    const output = await stripComments(input);
    expect(output.trim()).toBe(expectedOutput.trim());
  });

  it('removes MDX comments', async () => {
    const input = `
# Title

{foo /* || bar */}

Some text.

{/* This is an MDX comment. */}

More text.{/* This is an MDX comment. */}

\`{/* This is a comment in a code element. */}\`

{/**
 * Another MDX comment.
 */}
    `;

    const expectedOutput = `
# Title

{foo}

Some text.

More text.

\`{/* This is a comment in a code element. */}\`
    `;

    const output = await stripComments(input, { mdx: true });
    expect(output.trim()).toBe(expectedOutput.trim());
  });
});
