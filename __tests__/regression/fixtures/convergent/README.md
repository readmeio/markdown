# `convergent` Fixture

Demonstrates the **match** branch of `DiffResult`: input markdown that MDX and
MDXish render to **identical** HTML.

## What it proves

- Suite B (`equivalence.test.ts`) gets `{ status: 'match' }` from `diff()`.
- The bottom-up content-hash fast-path in `differ.ts` short-circuits when both
  trees hash equal.
- The convergent committed snapshot is the smallest possible diff result — any
  future regression that perturbs MDX↔MDXish parity on plain Markdown will
  flip this fixture from `match` to `differ` and surface on the PR.

## Why it's plain Markdown

The body deliberately avoids ReadMe custom syntax (no `<HTMLBlock>`, no
`<Variable>`, no glossary terms). Plain Markdown is the one input shape where
MDX and MDXish are expected to converge exactly. The `components/Note.mdx`
file exists to exercise the loader's optional `components/` directory branch
— it isn't referenced from `body.md`.

## Files

| File | Role |
|------|------|
| `body.md` | The rendered markdown (kept intentionally trivial) |
| `context.json` | Empty `variables` and `glossary` — nothing to substitute |
| `components/Note.mdx` | Registers `<Note>` for loader-coverage; unused in body |
