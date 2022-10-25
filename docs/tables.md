---
title: "Tables"
category: 5fdf7610134322007389a6ed
hidden: false
---
## Syntax

    | Left |  Center  | Right |
    |:-----|:--------:|------:|
    | L0   | **bold** | $1600 |
    | L1   |  `code`  |   $12 |
    | L2   | _italic_ |    $1 |

> ❗️ Table cells may contain inline decorations only.
>
> Lists, headings, and other block-level Markdown components are not valid and will cause errors.

### Examples

This example also shows off custom theming!

| Left |  Center  | Right |
|:-----|:--------:|------:|
| L0   | **bold** | $1600 |
| L1   |  `code`  |   $12 |
| L2   | _italic_ |    $1 |

## Custom CSS

Tables have been simplified to mirror a more standard implementation. We've also set up CSS variable-based theming, which should make it easier to add custom styles.

```scss CSS Variables
.markdown-body .rdmd-table {
  --table-text: black;
  --table-head: #5b1c9f;
  --table-head-text: white;
  --table-stripe: #f0eaf7;
  --table-edges: rgba(34, 5, 64, .5);
  --table-row: white;
}
```
```scss CSS Selectors
/* Table
 */
.markdown-body .rdmd-table table {}

/* Rows
 */
.markdown-body .rdmd-table tr {}
.markdown-body .rdmd-table thead tr {} /* header row's background */
.markdown-body .rdmd-table tr:nth-child(2n) {} /* striped rows' background */

/* Cells
 */
.markdown-body .rdmd-table th {}
.markdown-body .rdmd-table td {}
```

<style>
  .markdown-body .rdmd-table {
    --table-text: black;
    --table-head: #5b1c9f;
    --table-head-text: white;
    --table-stripe: #f0eaf7;
    --table-edges: rgba(34, 5, 64, .5);
    --table-row: white;
  }

  #rdmd-demo .markdown-body .rdmd-table thead tr {
    box-shadow: none;
  }

  #rdmd-demo .markdown-body .rdmd-table thead tr th:last-child {
    box-shadow: none;
  }
</style>
