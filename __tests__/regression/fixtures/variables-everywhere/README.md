# `variables-everywhere` Fixture

Exercises variable resolution across the trickier surfaces: inline code,
table cells (standalone-line resolution), component attributes, and a
Mermaid block where `<<-->>` / `<<->>` arrows must NOT be substituted.

## Source bugs

- PR #1459 — Mermaid sequence arrows were being parsed as legacy `<<...>>` variables
- PR #1471 — emphasis normalizer walking into `<code>` and converting underscores
- PR #1423 — user variables on standalone lines in tables not resolving
- Standalone variables not parsed in table cells (only attached-to-paragraph worked)
- CX-3789 — `{user.*}` in component attributes (`<Accordion title={user.name}>`) never
  resolved, because only text, expression, and code nodes were ever visited. Legacy
  `<<...>>` stays literal in attributes by design. Composite expressions
  (``title={`${user.a} ${user.b}`}``) are retained at parse time and evaluated at render

## What flips this fixture

Changes to the legacy variable transformer's language-skip set, the
`<<...>>` regex, the variable-in-table-cell handling, the attribute
resolution in `mdxish-render-utils.tsx`, or the variable resolution
context plumbing in `renderFixture.ts` itself.

## MDX side is empty by design

Legacy `<<varname>>` syntax is MDXish-specific. Strict MDX rejects the
input wholesale, so the committed `variables-everywhere (mdx) 1` snapshot
is `""`. The MDXish-side snapshot is the real regression contract.

## Substitution coverage

`renderFixture.ts` passes `variables` to both `mdxish()` and `renderMdxish()`,
so the snapshot exercises real end-to-end substitution: `<<apiKey>>` and
`{user.region}` inside inline/fenced code resolve through
`variablesCodeResolver` at parse time, while variables in body text and in
component attributes resolve through the render-stage path. All must match the
fixture's `context.json` values for the snapshot to lock; regressing any
resolution path will flip the snapshot.
