# `tables-with-html` Fixture

Captures the most repeatedly-fixed surface in `@readme/markdown`: raw HTML
tables mixed with inline `<code>`, attribute-carrying cells, markdown
images, and nested tags inside `<td>` content.

## Source bugs

- PR #1466 — `<code>` elements stripped from `<td>`
- PR #1467 — `<code>` content parsed as markdown in table cells
- PR #1463 — attributes (`class`, `colspan`, `style`) lost on raw `<table>` cells
- PR #1469 — md images forced to image-block instead of inline in table cells
- PR #1471 — emphasis normalizer walked into `<code>` and converted underscores
- HTML tags after the first one in a cell got backslash-escaped

## What flips this fixture

Any future change to `isTextOnly`, the `mdxJsxTextElement` branch, the table
HTML pass-through, or inline-element handling in `<td>`. A regression in any
of the six PRs above would alter the committed snapshot.
