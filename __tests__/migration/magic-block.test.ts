import * as rmdx from '@readme/mdx';

import { compatParser as mdast } from '@readme/backend/models/project/lib/migrateMdx/compatParser';

describe('migrating magic blocks', () => {
  it('compiles magic blocks without enough newlines', () => {
    const md = `
[block:api-header]
{
  "title": "About cBEYONData"
}
[/block]
[ Overview of cBEYONData ](/docs/about-cbeyondata) 
[block:api-header]
{
  "title": "About CFO Control Control Tower"
}
[/block]
[Overview of CFO Control Tower](https://docs.cfocontroltower.com/docs/about-cfo-control-tower) 
[block:image]
{
  "images": [
    {
      "image": [
        "https://files.readme.io/569fe58-Intro_Image02.png",
        "Intro Image02.png",
        1280,
        118,
        "#eaeaed"
      ],
      "sizing": "full",
      "caption": "<a href="https://cbeyondata.com/" target="_blank">cBEYONData.com</a>"
    }
  ]
}
[/block]

[block:callout]
{
  "type": "danger",
  "title": "CONFIDENTIAL",
  "body": "*This documentation is confidential and proprietary information of cBEYONData LLC.* "
}
[/block]
`;
    const ast = mdast(md);
    const mdx = rmdx.mdx(ast);
    expect(mdx).toMatchInlineSnapshot(`
      "## About cBEYONData

      [ Overview of cBEYONData ](/docs/about-cbeyondata)&#x20;

      ## About CFO Control Control Tower

      [Overview of CFO Control Tower](https://docs.cfocontroltower.com/docs/about-cfo-control-tower)&#x20;

      > ❗️ CONFIDENTIAL
      >
      > *This documentation is confidential and proprietary information of cBEYONData LLC.*&#x20;
      "
    `);
  });
});
