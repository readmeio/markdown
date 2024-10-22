import * as rmdx from '@readme/mdx';

import { compatParser as mdast } from '@readme/backend/models/project/lib/migrateMdx/compatParser';

describe('migrating html comments', () => {
  it('migrates escaped html comments', () => {
    const md = `
<!--

 

## Walkthrough

[block:html]
{
  "html": "<div style="position: relative; padding-bottom: 56.25%; height: 0;"><iframe src="https://www.loom.com/embed/53dd194717bb4965a8e838b95715ff18" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div>"
}
[/block]


<br />

\\-->
`;

    const ast = mdast(md);
    const mdx = rmdx.mdx(ast);
    expect(mdx).toMatchInlineSnapshot(`
      "{/*

       

      ## Walkthrough


      [block:html]
      {
        "html": "<div style="position: relative; padding-bottom: 56.25%; height: 0;"><iframe src="https://www.loom.com/embed/53dd194717bb4965a8e838b95715ff18" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div>"
      }
      [/block]



      <br />

      */}
      "
    `);
  });
});
