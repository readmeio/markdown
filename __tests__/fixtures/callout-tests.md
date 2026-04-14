---
title: 'Callouts Tests'
category: 5fdf9fc9c2a7ef443e937315
hidden: true
---

<Callout theme="default" icon="fa-duotone fa-solid fa-face-awesome">
### Default
</Callout>
<Callout theme="success" icon="fa-duotone fa-solid fa-face-awesome">
### Success
</Callout>
<Callout theme="info" icon="fa-duotone fa-solid fa-face-awesome">
### Info
</Callout>
<Callout theme="warn" icon="fa-duotone fa-solid fa-face-awesome">
### Warn
</Callout>
<Callout theme="error" icon="fa-duotone fa-solid fa-face-awesome">
### Error
</Callout>

<Callout theme="info">No Icon Info</Callout>
<Callout theme="error">No Icon Error</Callout>

<Callout icon="👍">No Theme 👍</Callout>

> 👍 Success
>
> This is the success callout.

> 📘 Info
>
> This is the info callout.

> 🚧 Warn
>
> This is the warn callout.

> ❗ Error
>
> This is the error callout.

> 👎 Markdown in callouts
>
> Unordered List
>
> - List Item 1
> - List Item 2

<Callout theme="error" icon="🔥">
### MDX Callout

---

With Markdown support.
</Callout>

> ❗
>
> Description Only

> ❔ Title Only _with italics_

> 📘 Callout with Links
>
> This callout has a [body link](https://example.com) that should use the default link color.

> 📘 Image with Center Alignment in Callout
>
> <Image src="https://files.readme.io/6f52e22-man-eating-pizza-and-making-an-ok-gesture.jpg" align="center" width="200" />

> 📘 Image with Left Alignment in Callout
>
> <Image src="https://files.readme.io/6f52e22-man-eating-pizza-and-making-an-ok-gesture.jpg" align="left" width="100" />
>
> This text should wrap around the left-aligned image inside the callout.

<Callout theme="info" icon="fa-duotone fa-solid fa-face-awesome">
### MDX Callout with Center Image

<Image src="https://files.readme.io/6f52e22-man-eating-pizza-and-making-an-ok-gesture.jpg" align="center" width="200" />
</Callout>

<Callout theme="info" icon="fa-duotone fa-solid fa-face-awesome">
### MDX Callout with Left Image

<Image src="https://files.readme.io/6f52e22-man-eating-pizza-and-making-an-ok-gesture.jpg" align="left" width="100" />

This text should wrap around the left-aligned image inside the MDX callout.
</Callout>
