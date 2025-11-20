import { stripComments } from '../../lib';

describe('removeComments', () => {
  it('removes HTML comments', async () => {
    const input = `Hello

<!-- comment -->

Beep boop bop <!--inline comment-->
Bop

[block:html]
{
  "html": "<h1>Magic blocks should not have comments removed.</h1>\n<!--custom html comment-->"
}
[/block]

<ResuableContent />

\`\`\`html
<div>
	Code blocks should not have comments removed.
  <!--code block comment-->
</div>
\`\`\`

[block:image]{ "images": [{ "image": ["https://owlbertsio-resized.s3.amazonaws.com/This-Is-Fine.jpg.full.png", "", "" ], "align": "center" } ]}[/block]

\`<!-- code block comment -->\`

<br />

<!--
  <p>
    Multiline comment
  </p>
-->

Beep boop bop

![](https://owlbertsio-resized.s3.amazonaws.com/This-Is-Fine.jpg.full.png)

Beep boop bop

| A  | B              | C  |
| :- | :------------- | :- |
| 1  | <!--comment--> | 3  |`;

    const output = await stripComments(input);
    expect(output).toMatchSnapshot();
  });

  it('removes MDX comments', async () => {
    const input = `
# Title

{foo /* || bar */}

Some text.

{/* This is an MDX comment. */}

More text.{/* This is an MDX comment. */}

\`{/* Comment in code element should NOT be removed */}\`

{/**
 * Another MDX comment.
 */}

Last text
    `;

    const output = await stripComments(input, { mdx: true });
    expect(output).toMatchSnapshot();
  });

  it('preserves non-mdx variables', async () => {
    const input = `Hello
<!-- should be removed -->
<<user>>
<!-- should be removed -->
<<hot_dog>>
<!-- should be removed -->
<<HOT_DIGGITY_DOG>>`;

    const output = await stripComments(input);
    expect(output).toBe(`Hello

<<user>>

<<hot_dog>>

<<HOT_DIGGITY_DOG>>`);
  });
});
