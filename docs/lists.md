---
title: "Lists"
category: 5fdf7610134322007389a6ed
hidden: false
---

[block:api-header]
{
  "title": "Syntax"
}
[/block]
```shell Bullet Lists
- Item Zed
  - Nested Item # indented 2 spaces
* Item Alt      # alternate bullet syntax
```
```shell Numeric Lists
1. Item Zed
   1. Nested Numeric # indented 3 spaces
2. Item One
```
```shell Check Lists
- [ ] Open Item
- [x] Item Done
```
[block:api-header]
{
  "title": "Examples"
}
[/block]
<details open>
  <summary><em>Bulleted List</em></summary><hr>

- Item Zed
  * Nested Item
  * Nested Item
- Item One
- Item Two

<hr></details>
<details>
  <summary><em>Ordered List</em></summary><hr>

1. Item Zed
   1. Nested Numeric
   1. Nested Numeric
1. Item One
2. Item Two

<hr></details>
<details>
  <summary><em>Check List</em></summary><hr>

- [ ] Task Zed
- [x] Task One
- [ ] Task Two

</details>

## Edge Cases

### Split Lists

Seamlessly insert content blocks in between list items:

1. Item Zed

   > Sit excepturi doloremque deserunt maiores quam voluptatibus cupiditate delectus perferendis, ratione cum impedit rem recusandae inventore quibusdam et, tenetur aspernatur asperiores reiciendis soluta.

1. Item One

   ```javascript
   console.log('hello world')
   ```

1. Item Two

### Auto-Ordering

Writing this will yield a properly ordered list:

    1. Item Zed
    1. Item One
    1. Item Two

Starting an ordered list with any number will increment continuously from that point, like so:

98. Starting in media res
98. Another list item
98. Yet another item
[block:html]
{
  "html": "<style>\n  summary {\n    padding-top: 8px;\n    outline: none !important;\n    user-select: none;\n  }\n  details[open] + details > summary {\n    padding-top: 0;\n  }\n  details > summary + hr {\n    opacity: .66;\n  }\n</style>"
}
[/block]
