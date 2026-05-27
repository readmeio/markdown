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

## Wrap

By default, left/right-aligned images float and let surrounding text wrap around them. Passing `wrap={false}` keeps the image hugging the same edge but stops text from wrapping.

**Left, wrap (default)**
<Image src="https://files.readme.io/6f52e22-man-eating-pizza-and-making-an-ok-gesture.jpg" align="left" width="200px" />

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.

**Left, no wrap**
<Image src="https://files.readme.io/6f52e22-man-eating-pizza-and-making-an-ok-gesture.jpg" align="left" width="200px" wrap={false} />

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.

**Right, no wrap**
<Image src="https://files.readme.io/6f52e22-man-eating-pizza-and-making-an-ok-gesture.jpg" align="right" width="200px" wrap={false} />

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.

**Framed left, no wrap**
<Image src="https://files.readme.io/6f52e22-man-eating-pizza-and-making-an-ok-gesture.jpg" framed="true" align="left" width="200px" wrap={false} />

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

**Framed right, no wrap**
<Image src="https://files.readme.io/6f52e22-man-eating-pizza-and-making-an-ok-gesture.jpg" framed="true" align="right" width="200px" wrap={false} />

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
