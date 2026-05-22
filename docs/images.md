---
title: Images
category:
  uri: uri-that-does-not-map-to-5fdf7610134322007389a6ed
privacy:
  view: public
---
## Syntax
```
![Alt text](https://cdn.path.to/some/image.jpg "This is some image...")
```

## Examples

![Bro eats pizza and makes an OK gesture.](https://files.readme.io/6f52e22-man-eating-pizza-and-making-an-ok-gesture.jpg "Pizza Face")


<Image src="https://files.readme.io/6f52e22-man-eating-pizza-and-making-an-ok-gesture.jpg" caption="lol he's eating pizza!" height="100px" align="center" border="true" />

## Framed

**Left**
<Image src="https://files.readme.io/6f52e22-man-eating-pizza-and-making-an-ok-gesture.jpg" framed="true" align="left" />

**Center**
<Image src="https://files.readme.io/6f52e22-man-eating-pizza-and-making-an-ok-gesture.jpg" framed="true" align="center" />

**Right**
<Image src="https://files.readme.io/6f52e22-man-eating-pizza-and-making-an-ok-gesture.jpg" framed="true" align="right" />

**Framed with caption**
<Image src="https://files.readme.io/6f52e22-man-eating-pizza-and-making-an-ok-gesture.jpg" framed="true" align="center" caption="Pizza guy in a frame" />

## Floated alignment

The next two cases verify that a heading after a floated `<Image>` starts on its own line instead of wrapping alongside the image.

<Image src="https://files.readme.io/6f52e22-man-eating-pizza-and-making-an-ok-gesture.jpg" align="right" width="200px" />

Body text that flows next to the floated image on the left.

### Heading after a right-floated image

Body text under the new heading.

<Image src="https://files.readme.io/6f52e22-man-eating-pizza-and-making-an-ok-gesture.jpg" align="left" width="200px" />

Body text that flows next to the floated image on the right.

### Heading after a left-floated image

Body text under the new heading.
