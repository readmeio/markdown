# `jsx-table-unclosed-cells` Fixture

A JSX `<Table>` whose cells contain a `doc:` markdown link plus a `<span>`
whose opener and closer lines disagree on shape (`<span>Cell 2\nCell 3\n</span>`).
Patterns like this make the strict `mdxjs` re-parse of cell content throw
("Expected a closing tag…before the end of `paragraph`"), which historically
dropped the entire table.

## Source bugs

- PR #1465 — malformed/unclosed/asymmetric HTML inside JSX `<Table>` cells
  silently broke the whole table. The fix adds two scoped recovery passes that
  run *only after* the strict parse fails: `repairUnclosedTags` synthesizes
  missing closers via `htmlparser2`, and `normalizeTagSpacing` inserts newlines
  so an opener-line and closer-line agree on whether the tag is bare or
  attached to text. Before the fix, `<Table>` (capitalized) had no recovery
  path at all — only lowercase `<table>` did.

## MDX side is empty by design

Strict MDX rejects the asymmetric `<span>` during parse, so the committed
`jsx-table-unclosed-cells (mdx) 1` snapshot is `""`. The MDXish-side snapshot
is the real regression contract: it shows the recovered table with the
`doc:create-response` link resolved to a real `<a class="doc-link">` and
"Cell 2 / Cell 3" rendered inside the repaired `<span>`.

## What flips this fixture

Any change to `repairUnclosedTags`, `normalizeTagSpacing`, the order in which
the strict parse and the recovery passes run, or the `doc:` link resolver.
