---
title: "Lists"
slug: "lists"
hidden: false
---
[block:api-header]
{
  "title": "Examples"
}
[/block]
### Unordered Lists

#### Bulleted List

- Item Zed
  * Nested Bullet
  * Nested Bullet
- Item One
- Item Two

### Ordered List

1. Item Zed
   1. Nested Numeric
   1. Nested Numeric
1. Item One
2. Item Two

#### Check List

- [ ] Task Zed
- [x] Task One
- [ ] Task Two

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