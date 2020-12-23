---
title: "Embeds"
slug: "embeds"
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
### Magic Block
[block:embed]
{
  "html": "<iframe class=\"embedly-embed\" src=\"//cdn.embedly.com/widgets/media.html?src=https%3A%2F%2Fwww.youtube.com%2Fembed%2FJ3-uKv1DShQ%3Ffeature%3Doembed&display_name=YouTube&url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DJ3-uKv1DShQ&image=https%3A%2F%2Fi.ytimg.com%2Fvi%2FJ3-uKv1DShQ%2Fhqdefault.jpg&key=f2aa6fc3595946d0afc3d76cbbd25dc3&type=text%2Fhtml&schema=youtube\" width=\"640\" height=\"480\" scrolling=\"no\" title=\"YouTube embed\" frameborder=\"0\" allow=\"autoplay; fullscreen\" allowfullscreen=\"true\"></iframe>",
  "url": "https://www.youtube.com/watch?v=J3-uKv1DShQ&feature=youtu.be",
  "title": "Funny Solidier Drop Kick",
  "favicon": "https://s.ytimg.com/yts/img/favicon-vfl8qSV2F.ico",
  "image": "https://i.ytimg.com/vi/J3-uKv1DShQ/hqdefault.jpg"
}
[/block]
### Markdown Block

[Embed Title](https://youtu.be/8bh238ekw3 "@embed")

## Known Issues

At the moment, embed links written in the new ReadMe-flavored markdown syntax will simply display the link. (Magic block embeds will continue to work, though!) We're aware of the shortcoming, and plan to refactor this component as we move forward.