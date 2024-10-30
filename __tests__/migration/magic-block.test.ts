import { migrate } from '../../index';

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
    const mdx = migrate(md);
    expect(mdx).toMatchInlineSnapshot(`
      "## About cBEYONData

      [ Overview of cBEYONData ](/docs/about-cbeyondata) 

      ## About CFO Control Control Tower

      [Overview of CFO Control Tower](https://docs.cfocontroltower.com/docs/about-cfo-control-tower) 

      > ❗️ CONFIDENTIAL
      >
      > *This documentation is confidential and proprietary information of cBEYONData LLC.* 
      "
    `);
  });
});
