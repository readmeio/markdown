---
title: "Tables"
slug: "tables"
hidden: false
createdAt: "2019-12-10T01:01:15.097Z"
updatedAt: "2020-04-16T17:45:25.365Z"
---
## Syntax

> **Note**: table cells may contain inline decorations only.

    | Left |  Center  | Right |
    |:-----|:--------:|------:|
    | L0   | **bold** | $1600 |
    | L1   |  `code`  |   $12 |
    | L2   | _italic_ |    $1 |

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
  --table-head: #f44336;
  --table-head-text: white;
  --table-stripe: #FFCDD2;
  --table-edges: rgba(183, 28, 28, .33);
  --table-row: #FFEBEE;
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
[block:html]
{
  "html": "<style>\n  .markdown-body .rdmd-table {\n    --table-text: black;\n    --table-head: #f44336;\n    --table-head-text: white;\n    --table-stripe: #FFCDD2;\n    --table-edges: rgba(183, 28, 28, .33);\n    --table-row: #FFEBEE;\n  }\n</style>"
}
[/block]