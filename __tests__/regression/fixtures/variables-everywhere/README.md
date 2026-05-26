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

## Known wiring gap

`renderFixture.ts` passes `variables` only to `renderMdxish()`, not to
`mdxish()` where the legacy-variable transform runs. So `<<apiKey>>` and
similar will currently render as the uppercase-missing fallback on the
MDXish side (`APIKEY`, not `sk_test_abc123`). This is documented behavior
of the test render helper — committed snapshots lock in the current state.
