# `divergent` Fixture

Demonstrates the **differ** branch of `DiffResult`: input markdown that MDX
and MDXish render to **different** HTML on purpose.

## What it proves

- Suite B (`equivalence.test.ts`) gets
  `{ status: 'differ', severity: 'structural', changes: [...] }` from `diff()`.
- The change list is deterministic and document-ordered.
- Severity scoring fires.
- Suite A (`snapshots.test.ts`) commits two distinct per-engine snapshots,
  proving the engines really do produce different HTML for this input.

## Why it diverges

The body uses `<HTMLBlock safeMode={true}>{`...`}</HTMLBlock>`. The two engines
handle that custom block differently:

- **MDX** wraps the raw HTML in its safe-mode container (a `<pre class="html-unsafe">`-style envelope).
- **MDXish** processes the HTML body more directly.

The result is a structural divergence that's small, stable, and easy to read
in snapshot diffs. If a future engine change accidentally aligns these two
outputs, the divergent snapshot collapses — that's a meaningful signal worth
reviewing, not a flake.

## Files

| File | Role |
|------|------|
| `body.md` | One `<HTMLBlock>` plus a trailing paragraph |
| `context.json` | Empty `variables` and `glossary` — divergence is engine-driven, not data-driven |

No `components/` directory — this fixture doesn't need custom blocks.
