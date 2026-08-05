# `variables-everywhere` Fixture

Exercises variable resolution across the trickier surfaces: inline code,
table cells (standalone-line resolution), and a Mermaid block where
`<<-->>` / `<<->>` arrows must NOT be substituted.

## Source bugs

- PR #1459 — Mermaid sequence arrows were being parsed as legacy `<<...>>` variables
- PR #1471 — emphasis normalizer walking into `<code>` and converting underscores
- PR #1423 — user variables on standalone lines in tables not resolving
- Standalone variables not parsed in table cells (only attached-to-paragraph worked)

## What flips this fixture

Changes to the legacy variable transformer's language-skip set, the
`<<...>>` regex, the variable-in-table-cell handling, or the variable
resolution context plumbing in `renderFixture.ts` itself.

## MDX side is empty by design

Legacy `<<varname>>` syntax is MDXish-specific. Strict MDX rejects the
input wholesale, so the committed `variables-everywhere (mdx) 1` snapshot
is `""`. The MDXish-side snapshot is the real regression contract.

## Substitution coverage

`renderFixture.ts` passes `variables` to both `mdxish()` and `renderMdxish()`,
so the snapshot exercises real end-to-end substitution: `<<apiKey>>` and
`{user.region}` inside inline/fenced code resolve through
`variablesCodeResolver` at parse time, while variables outside code resolve
through the render-stage path. Both must match the fixture's `context.json`
values for the snapshot to lock; regressing either resolution path will
flip the snapshot.
