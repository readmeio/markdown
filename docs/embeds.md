---
title: "Embeds"
category: 5fdf7610134322007389a6ed
hidden: false
---

[block:api-header]
{
  "title": "Syntax"
}
[/block]
Embedded content is written as a simple Markdown link, with a title of "@embed", like so:

    [Embed Title](https://youtu.be/8bh238ekw3 "@embed")
[block:api-header]
{
  "title": "Examples"
}
[/block]

[block:embed]
{
  "html": false,
  "url": "https://github.com/readmeio/api-explorer/pull/671",
  "title": "RDMD CSS theming and style adjustments. by rafegoldberg · Pull Request #671 · readmeio/api-explorer",
  "favicon": "https://github.com/favicon.ico",
  "image": "https://avatars2.githubusercontent.com/u/6878153?s=400&v=4"
}
[/block]

[block:embed]
{
  "html": false,
  "url": "https://www.nytimes.com/2020/05/03/us/politics/george-w-bush-coronavirus-unity.html",
  "title": "George W. Bush Calls for End to Pandemic Partisanship",
  "favicon": "https://www.nytimes.com/vi-assets/static-assets/favicon-4bf96cb6a1093748bf5b3c429accb9b4.ico",
  "image": "https://static01.nyt.com/images/2020/05/02/world/02dc-virus-bush-2/merlin_171999921_e857a690-fb9b-462d-a20c-28c8161107c9-facebookJumbo.jpg"
}
[/block]
<details><summary><b>Magic Block</b> (Embedly)</summary><br>
[block:embed]
{
  "html": "<iframe class=\"embedly-embed\" src=\"//cdn.embedly.com/widgets/media.html?src=https%3A%2F%2Fwww.youtube.com%2Fembed%2FJ3-uKv1DShQ%3Ffeature%3Doembed&display_name=YouTube&url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DJ3-uKv1DShQ&image=https%3A%2F%2Fi.ytimg.com%2Fvi%2FJ3-uKv1DShQ%2Fhqdefault.jpg&key=f2aa6fc3595946d0afc3d76cbbd25dc3&type=text%2Fhtml&schema=youtube\" width=\"640\" height=\"480\" scrolling=\"no\" title=\"YouTube embed\" frameborder=\"0\" allow=\"autoplay; fullscreen\" allowfullscreen=\"true\"></iframe>",
  "url": "https://www.youtube.com/watch?v=J3-uKv1DShQ&feature=youtu.be",
  "title": "Funny Solidier Drop Kick",
  "favicon": "https://s.ytimg.com/yts/img/favicon-vfl8qSV2F.ico",
  "image": "https://i.ytimg.com/vi/J3-uKv1DShQ/hqdefault.jpg"
}
[/block]
</details>
<details><summary><b>Magic Block</b> (iFrame)</summary><br>
[block:embed]
{
  "html": "<iframe class=\"embedly-embed\" src=\"//cdn.embedly.com/widgets/media.html?src=https%3A%2F%2Fwww.google.com%2Fmaps%2Fembed%2Fv1%2Fplace%3Fcenter%3D37.829698%252C-122.258166%26key%3DAIzaSyD9HrlRuI1Ani0-MTZ7pvzxwxi4pgW0BCY%26zoom%3D16%26q%3DMama%27s%2BRoyal%2BCafe&display_name=Google+Maps&url=https%3A%2F%2Fwww.google.com%2Fmaps%2Fplace%2FMama%27s%2BRoyal%2BCafe%2F%4037.829698%2C-122.258166%2C16z%2Fdata%3D%214m13%211m7%213m6%211s0x80857dfb145a04ff%3A0x96b17d967421636f%212s4126%2BOpal%2BSt%2C%2BOakland%2C%2BCA%2B94609%213b1%218m2%213d37.8296978%214d-122.2581661%213m4%211s0x0%3A0x722326b6c2ac7642%218m2%213d37.8277961%214d-122.2563006%3Fhl%3Den&image=http%3A%2F%2Fmaps-api-ssl.google.com%2Fmaps%2Fapi%2Fstaticmap%3Fcenter%3D37.829698%2C-122.258166%26zoom%3D15%26size%3D250x250%26sensor%3Dfalse&key=f2aa6fc3595946d0afc3d76cbbd25dc3&type=text%2Fhtml&schema=google\" width=\"600\" height=\"450\" scrolling=\"no\" title=\"Google Maps embed\" frameborder=\"0\" allow=\"autoplay; fullscreen\" allowfullscreen=\"true\"></iframe>",
  "url": "https://www.google.com/maps/place/Mama's+Royal+Cafe/@37.829698,-122.258166,16z/data=!4m13!1m7!3m6!1s0x80857dfb145a04ff:0x96b17d967421636f!2s4126+Opal+St,+Oakland,+CA+94609!3b1!8m2!3d37.8296978!4d-122.2581661!3m4!1s0x0:0x722326b6c2ac7642!8m2!3d37.8277961!4d-122.2563006?hl=en",
  "title": "Mama's Royal Cafe",
  "favicon": "https://www.google.com/images/branding/product/ico/maps15_bnuw3a_32dp.ico",
  "image": "http://maps-api-ssl.google.com/maps/api/staticmap?center=37.829698,-122.258166&zoom=15&size=250x250&sensor=false"
}
[/block]
</details>
<details><summary><b>Markdown Block</b></summary><br>

[Embed Title](https://youtu.be/8bh238ekw3 "@embed")

</details>

## Known Issues
At the moment, embed links written in the new ReadMe-flavored markdown syntax will simply display the link. (Magic block embeds will continue to work, though!) We're aware of the shortcoming, and plan to refactor this component as we move forward.
[block:html]
{
  "html": "<style>\n  summary {\n    outline: none;\n    user-select: none;\n  }\n</style>"
}
[/block]
