# `components-under-list-items` Fixture

Components written directly under a list item with their lines at column 0 —
one column short of the item's content indent, so CommonMark treats them as
lazy continuation lines. Covers a nested wrapper (`<Steps>`/`<Step>`), a
multi-line attribute expression (`code={…}`), and a readme `<Callout>`.

## Source bugs

- CX-3940 — the `mdxComponent` tokenizer stopped claiming at the first lazy
  line, leaving a truncated opener (`<ExpressionPropCodeBlock`) as raw html.
  The body spilled out as paragraphs, and the next raw tag crashed parse5
  with "Cannot read properties of null (reading 'tagName')".

## MDX side is empty by design

Strict MDX rejects lazy lines inside a JSX opener ("Unexpected lazy line in
container"). The MDXish snapshot is the regression contract: each component
renders inside its `<li>`.

## What flips this fixture

`continueOnNextLine` in the `mdxComponent` tokenizer, or the document-level
lazy-line handling that keeps a list item open while a flow token spans lines.
