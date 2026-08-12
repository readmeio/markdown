# `indented-component-body-lists` Fixture

A bullet list inside a component body indented by two columns — the shape the
MDXish serializer writes for every JSX child, and therefore the shape every
editor save produces.

## Source bugs

- RM-17790 — bullet lists inside `<Accordion>` rendered with each item after
  the first nested a level deeper. `parseMdChildren` ran `.trim()` over the
  component body, which stripped the leading whitespace of the *first* line
  only, so a uniformly two-column body reparsed with its first item at column 0
  and every later item still at column 2:

  ```markdown
  - first
    - second
  ```

  CommonMark reads that second line as a nested list. Two-column bodies are
  below `safeDeindent`'s four-column gate, so nothing had dedented them first.
  The `<Accordion>` body here is the customer doc from the ticket.

## What it proves

- All three items of the accordion list render as siblings in one `<ul>`, not
  as a chain of nested lists.
- The callout list keeps its one genuinely deeper item nested — the fix
  preserves relative indentation rather than flattening everything.
- The trailing unindented list renders identically to the indented ones,
  pinning that body indentation is invisible in the output.

## What flips this fixture

`parseMdChildren`'s edge trimming, `safeDeindent`'s four-column gate, or any
change to how CommonMark list continuation is measured in component bodies.
