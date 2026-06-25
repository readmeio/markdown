# Regression Fixture Format

Each fixture is a self-contained directory that both regression suites pick up
automatically. This README is the single source of truth for hand-authoring a
new fixture — you should not need to read any TypeScript to get started.

---

## 1. Directory Convention & File Roles

A fixture lives directly under `__tests__/regression/fixtures/`. The directory
name becomes the fixture name shown in test output and snapshot keys.

```
__tests__/regression/fixtures/
│
│  ── Baseline fixtures (engine behavior baselines) ──
├── convergent/                 ← match branch of DiffResult (plain markdown)
│   ├── body.md                 ← REQUIRED
│   ├── context.json            ← REQUIRED
│   └── components/             ← optional
│       └── Note.mdx            ← registers <Note>
├── divergent/                  ← differ branch of DiffResult (HTMLBlock safeMode)
├── rich/                       ← exercises components + variables + glossary
│
│  ── Regression fixtures (each grounded in a real merged bug fix) ──
├── tables-with-html/           ← raw <table> with <code>, attrs, inline content
├── magic-blocks-table/         ← consecutive [block:parameters] with HTML
├── unclosed-tags/              ← orphan/unclosed JSX openers and closers
├── callouts-and-glossary/      ← <Callout>, <Glossary>, FA emoji in headers
├── jsx-attribute-entities/     ← HTML entities in JSX attribute values
├── variables-everywhere/       ← <<vars>>, {user.x}, Mermaid arrow preservation
├── embeds/                     ← <Embed typeOfEmbed="..." /> variants
├── consecutive-emojis-fa/      ← :grin::grin:, FA in callouts and components
├── compact-headings/           ← #Heading-without-space migration coverage
├── htmlblock-with-script/      ← <HTMLBlock> static-content parse path
│
│  ── Table regression fixtures ──
├── jsx-table-multiline-cells/  ← blank-line paragraphs preserved in a <Table> cell
├── jsx-table-unclosed-cells/   ← asymmetric/unclosed tags in <Table> cells recovered
├── table-unwrapped-rows/       ← cells/rows missing their <tr> and <tbody> wrappers
├── htmlblock-in-table/         ← <HTMLBlock> rendered inside a <Table> cell
├── legacy-vars-in-table/       ← <<vars>> resolved in a raw <table> cell
└── callout-icons/              ← blockquote + FA-class-icon <Callout> render
```

See each fixture's own `README.md` for what it specifically covers and which
merged PRs / Linear tickets motivated it. Regression fixtures intentionally
exercise inputs strict MDX may not accept (`[block:...]`, `<<>>` variables,
orphan tags) — those fixtures lock in the MDXish-side render and accept
`""` on the MDX side. Each fixture's README calls this out where it applies.

### File roles

| File | Required? | Purpose |
|------|-----------|---------|
| `body.md` | Yes | The Markdown source rendered by both engines |
| `context.json` | Yes | Supplies `variables` and `glossary` for the render |
| `components/` | No | Optional subdirectory; each `*.mdx` file registers a custom component |

**`body.md`** — The Markdown body that gets rendered. Plain Markdown, GFM, and
any ReadMe custom syntax are all accepted.

**`context.json`** — Required JSON file parsed by the loader. It provides
`variables` (default values and per-render overrides) and `glossary` entries.
See section 2 for the exact schema.

**`components/` subdirectory** — Optional. If present, the loader reads every
`.mdx` file inside and registers it as a custom component. The filename
(without `.mdx`) becomes the tag name. For example,
`components/Note.mdx` registers `<Note>` — exactly as in `convergent/`.
If the `components/` directory is absent the fixture still loads normally;
`components` defaults to an empty array.

---

## 2. `context.json` Schema

`context.json` contains exactly three top-level fields. Do not add any others —
unrecognised fields are silently ignored by the loader.

### Fields

**`variables.defaults`** — `Array<{ name: string; default: string }>`

Fixture-scoped default values for `{user.<name>}` variable references in
`body.md`. If a variable is referenced in `body.md` but not overridden by
`variables.user`, this default value is used.

```json
"defaults": [{ "name": "userName", "default": "Anonymous" }]
```

**`variables.user`** — `Record<string, string>`

Per-render override values keyed by variable name. Values here take precedence
over `variables.defaults`.

```json
"user": { "userName": "Ada Lovelace" }
```

**`glossary`** — `Array<{ term: string; definition: string }>`

Glossary entries available to the render context.

```json
"glossary": [{ "term": "MDX", "definition": "Markdown with JSX" }]
```

### Complete minimal example

```json
{
  "variables": {
    "defaults": [{ "name": "userName", "default": "Anonymous" }],
    "user": { "userName": "Ada Lovelace" }
  },
  "glossary": [{ "term": "MDX", "definition": "Markdown with JSX" }]
}
```

### Empty context is valid

Both `convergent/` and `divergent/` ship with the minimal empty form:

```json
{
  "variables": {
    "defaults": [],
    "user": {}
  },
  "glossary": []
}
```

This is a perfectly valid `context.json`. Start here and add fields only as
needed.

> **Note:** `components` does **not** appear in `context.json`. Custom
> components are registered by placing `.mdx` files in the `components/`
> subdirectory. The loader builds the `components` array from those files, not
> from the JSON.

---

## 3. Adding a New Fixture (Step-by-Step)

1. **Create a new directory** under `__tests__/regression/fixtures/`. The
   directory name is the fixture name — choose something descriptive
   (e.g. `callout-basic`, `table-alignment`).

2. **Write `body.md`** — the Markdown source to render. A minimal example:

   ```md
   # Hello

   World
   ```

   Use the existing `convergent/body.md` or `divergent/body.md` as copy-paste
   starting points.

3. **Write `context.json`** — copy `convergent/context.json` (a valid minimal
   example) and populate as needed:

   ```bash
   cp __tests__/regression/fixtures/convergent/context.json \
      __tests__/regression/fixtures/<your-fixture>/context.json
   ```

   If your `body.md` has no variable references or glossary terms, leave the
   empty form unchanged.

4. **(Optional) Add a `components/` subdirectory** with one `.mdx` file per
   custom component. Follow the filename-equals-tag convention from section 1.
   See `convergent/components/Note.mdx` as a living example.

5. **Run `npm test`**. The new fixture is auto-discovered by both suites — no
   code change required. On first run you will see:

   - **Suite A** (`snapshots.test.ts`): 2 new snapshot entries created — one
     per engine (`mdx` and `mdxish`).
   - **Suite B** (`equivalence.test.ts`): 1 new snapshot entry created — the
     `diff()` result comparing the two engines.

6. **Review the generated `.snap` entries** under
   `__tests__/regression/__snapshots__/`. If they look correct, commit the
   fixture directory together with the new `.snap` entries.

---

## 4. How Each Suite Consumes Fixtures

**Suite A** (`snapshots.test.ts`) renders the fixture through both engines
(MDX and MDXish) separately and calls `toMatchSnapshot()` on the raw HTML
string each engine emits, producing **two `.snap` entries per fixture**. Snapshot
keys follow the shape `Suite A: per-engine > <fixture> (<engine>) 1` (e.g.
`Suite A: per-engine > convergent (mdx) 1`). Any byte-level change to the
engine output — attribute order, whitespace, structure — surfaces as a failing
snapshot on the PR that caused it.

**Suite B** (`equivalence.test.ts`) renders the fixture through both engines,
calls `diff()` on the two HTML strings, and snapshots the diff result, producing
**one `.snap` entry per fixture**. Keys follow `Suite B: MDX↔MDXish equivalence > <fixture> 1`.
As MDX↔MDXish parity improves, the diff result shrinks toward an empty change
list.

Both suites discover fixture directories with the same pattern — no code change
is needed when you add a new directory:

```typescript
readdirSync(FIXTURES_DIR, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)
```
