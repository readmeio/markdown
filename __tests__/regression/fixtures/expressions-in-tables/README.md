# `expressions-in-tables` Fixture

A large raw `<table>` (trimmed-down real customer doc) whose cells mix inline
`<code>`, `<br />`, `<blockquote>`/`<ul>` flow content, `rowspan` attributes,
and — the crux — brace expressions such as `--split-depth={nesting-level-number-value}`,
`{your-property-name}`, and `{"your-rule-format"}` inside code spans. Locks in
that a `{…}` in a cell no longer collapses the entire table into one row.

## Source bugs

- CX-3698 — a `{…}` expression in a cell (e.g. `<code>--split-depth={n}</code>`)
  matched `mdxishMdxComponentBlocks`'s nested-attribute-expression heuristic
  (`/[\w-]+\s*=\s*\{/`, meant for `key={i}` component attributes). The lowercase
  `<table>` was promoted to an `mdxJsxFlowElement` and its body re-parsed as
  inline markdown, collapsing every row into a single mangled cell. The fix
  excludes table-structural tags from that promotion (they were already excluded
  from the nested-component-tag branch) so `mdxishTables` re-parses the table and
  keeps expressions intact.

## What flips this fixture

The `isTableStructuralTag` guard on `hasNestedExpressionAttr` in
`processor/transform/mdxish/components/mdx-blocks.ts`, any change to how
`mdxishTables` parses cells carrying `{…}` expressions, or a change to
`evaluateExpressions` (self-contained expressions like `{"your-rule-format"}`
still evaluate; identifier expressions like `{your-property-name}` stay literal).
