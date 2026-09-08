# Mistaken table closer (`<table>` for `</table>`)

Customer docs typo the table closer as a second opening `<table>`
instead of `</table>`. Without repair, the HTML flow block swallows the
following Notes callout as raw text.

## Source bug

- CX-3850 — malformed table close tag breaks Notes callouts across a
  customer's behavior/criterion docs (all versions)

## MDX side is empty by design

Strict MDX cannot recover the mistyped closer. The MDXish-side snapshot
is the regression contract — `repairMistakenTableClosers` rewrites the
bare second `<table>` to `</table>` before `jsxTable` /
`terminateHtmlFlowBlocks` run.

## What flips this fixture

Any change to `repairMistakenTableClosers`, its placement in
`preprocessContent`, or the typo heuristic (a bare opener alone on its
line, at table depth ≥ 1, whose element ends implicitly without table-
structure children).
