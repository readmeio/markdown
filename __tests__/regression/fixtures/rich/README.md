# `rich` Fixture

Exercises the three data inputs the loader and render helper plumb
through to both engines: **custom components**, **variables**, and
**glossary**.

Whereas `convergent` and `divergent` exist to demonstrate the two arms
of `DiffResult` on minimal markdown, this fixture exists to make sure
the plumbing for richer inputs is wired and surfaces in the snapshots.
The `status` of its Suite B diff (`match` vs `differ`) is incidental —
whatever the engines do with these inputs is the regression contract
going forward.

## What it covers

| Feature                          | Where in `body.md`                  | Where in `context.json` / `components/` |
|----------------------------------|-------------------------------------|------------------------------------------|
| Legacy variable substitution     | `<<apiKey>>`                        | `variables.user.apiKey`                  |
| Default-with-no-user-override    | `<<region>>`                        | `variables.defaults[0]`                  |
| MDX-style variable interpolation | `{user.region}` inside `<Note>`     | resolved via `defaults` (no `user` override) |
| Glossary term                    | `<Glossary>acme</Glossary>`         | `glossary[0]`                            |
| Custom component                 | `<Note>…</Note>`                    | `components/Note.mdx` (wraps `<Callout>`) |

## Why it isn't "convergent"

Custom components are the most common source of MDX↔MDXish divergence
(`convergent`'s `body.md` was deliberately kept as plain Markdown for
exactly this reason). `rich`'s Suite B snapshot is a `status: 'differ'`
result and that is the point — the snapshot locks in the current
cross-engine behavior across all three feature surfaces.

## What the committed snapshots actually show

- **Legacy `<<name>>` variables don't substitute on the MDX side.** MDX
  renders `<<apiKey>>` as literal text. `<<>>` is MDXish-flavored
  syntax; the MDX equivalent would be `<Variable name="apiKey" />`.
  This is expected.
- **Legacy `<<name>>` variables fall through to the uppercase-missing
  fallback on the MDXish side** (`APIKEY`, `REGION`, `NAME`). That
  happens because `renderFixture.ts` passes `variables` only to
  `renderMdxish()`, while the legacy-variable transform runs earlier
  inside `mdxish()`. This is a wiring detail in the test render helper,
  not a flaw in the engines. If `renderFixture.ts` is later changed to
  also pass `variables` into the `mdxish()` call, this fixture's
  snapshots will update to show resolved values — which is exactly the
  kind of regression signal these suites exist to capture.
- **Glossary terms and custom components work in both engines.** The
  `<Glossary>acme</Glossary>` renders as `<span
  class="GlossaryItem-trigger">acme</span>` and `<Note>…</Note>`
  renders through `<Callout>` as a themed blockquote in both outputs.

## Files

| File                    | Role                                                    |
|-------------------------|---------------------------------------------------------|
| `body.md`               | Exercises all three features in one render              |
| `context.json`          | Supplies `variables.defaults`, `variables.user`, `glossary` |
| `components/Note.mdx`   | Registers `<Note>` as a `<Callout>` wrapper             |
