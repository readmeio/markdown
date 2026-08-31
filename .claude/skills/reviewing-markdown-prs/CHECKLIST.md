# @readme/markdown PR review checklist (complete)

Standards mined from six months of human review comments (PRs #1351–#1603, 2026-03→2026-08),
`CLAUDE.md`, and the repo's enforced configs. Severity: 🔴 blocking · 🟡 should. There is no nit
tier — anything below 🟡 is dropped, not reported. PR numbers cite the review that set the
standard.

## Architecture & pipeline integrity  ·  _lib/mdx.ts, lib/mdxish.ts, processor/**_

- 🔴 **No regex/preprocess band-aids.** Prefer micromark tokenizers, real MDAST/HAST/ESTree
  nodes, and AST walks over regexing source, sentinel swaps, protect-and-restore passes, or
  regexing serialized JSON (`JSON.stringify(declaration)` — #1470). "Using bad architecture to
  address bad architecture is just going to compound problems" (#1429); sentinel-swap "doesn't
  feel right" (#1511); protect-and-restore is a paradigm to move away from (#1410). Use existing
  structural tools: `micromark-util-character` over hand-rolled char classes (#1539),
  `hast-util-to-html` over manual serialization (#1420), a tag-walker over line-by-line regex
  scans (#1597).
- 🔴 **Never fork the pipeline by consumer.** `newEditorTypes` is named tech debt (#1420, #1429);
  no new editor-vs-renderer conditional plugins or branches — fix the shared node shape. The
  engine owns its transforms; consumers don't pre-process.
- 🔴 **The editor must never evaluate expressions** — expression evaluation cannot move earlier
  in the processor where the editor path would hit it (#1361, caused regression RM-15705).
- 🔴 **mdxish must tolerate invalid MDX.** Any dependence on the strict `mdxjs()` parser inside
  the mdxish path needs a repair/fallback strategy — the entire philosophy is that users don't
  have to write valid MDX (#1465).
- 🔴 **Repair/recovery logic must never lose content.** An unclosed tag or failed parse degrades
  to visible content; bail on `implicit` closes rather than swallow everything after the node
  (#1540, #1371).
- 🔴 **Custom node type strings come from `enums.ts` `NodeTypes`**, never inline literals;
  mdast→hast via `data.hName` + `data.hProperties` matching a registered component.
- 🟡 **Tokenizer/transform ordering is documented.** Say why an extension sits before/after its
  neighbors (`jsxComment` before `magicBlock` so it claims `{/* … */}` first — #1419, #1439);
  keep the ordered pipeline-steps comment in `lib/mdxish.ts` current (#1380).
- 🟡 **Match legacy/`mdx-js` behavior; change minimally** (CLAUDE.md). Reference the `v6` branch
  parsers; when new behavior matches legacy, make it the default rather than adding a flag —
  "Not a huge fan of adding any extra flags or optional behavior unless it's absolutely one
  thousand percent necessary" (#1406). Behavior-removing changes need an option, not an
  unconditional strip (#1574).
- 🟡 **Keep functions small**; single-purpose helpers (CLAUDE.md).

## Parsing & tokenizers  ·  _lib/micromark/**_

- 🔴 **Bounded, linear scans.** Regex/scan work in tokenizers must stay linear in input size —
  gate expensive paths and bound quantifiers per marker family (#1594); loose-emphasis
  normalization was specifically re-bounded to stay linear.
- 🔴 **Raw-payload constructs survive intact.** Table/tag repair must not rewrite payloads inside
  `<pre>/<script>/<style>/<textarea>` or comments (#1597 greptile P1, #1569 — token-aware
  detection over raw-string `</table>` regex).
- 🟡 **Name tokenizers for what they actually tokenize** — the "pascalcase" tokenizer also
  claiming `img` needed a more general name (#1389).
- 🟡 **Shared tokenizer helpers live in one place** — a duplicate of a jsx-table helper belongs
  in a shared utility (#1389); `pointAfter`-style helpers consolidate into `processor/utils.ts`
  (#1540).

## Transformers, plugins & compile handlers  ·  _processor/transform/**, processor/plugin/**, processor/compile/**_

- 🔴 **Files in `processor/transform/` export transformers.** Utility functions move to a utils
  file (#1429). Kebab-case filenames; `<x>Transformer` factories `(opts = {}) => (tree) => …`;
  rehype plugins named `rehype<X>`; mdxish-only transforms under `processor/transform/mdxish/`.
- 🟡 **`visit` returns `SKIP`/`CONTINUE`/`EXIT` constants** from `unist-util-visit`, with a
  comment saying why — never bare booleans/numbers.
- 🟡 **Compile handlers follow `mdast-util-to-markdown` conventions** — `state.enter`,
  `state.createTracker`, `containerFlow`; keyed by `NodeTypes`; `satisfies Handlers` (#1595).
- 🟡 **Register centrally** — `defaultTransforms`/`mdxishTransformers` in
  `processor/transform/index.ts` or the lib pipeline; option-tuples `[transformer, opts]`.
- 🟡 **New transformers carry JSDoc** explaining behavior + rationale, citing the motivating
  ticket for weird-input handling (repo pattern, e.g. CX-3850 in repair-mistaken-table-closers).

## Code structure, reuse & simplicity  ·  _repo-wide_

- 🔴 **A second list that must stay in sync with an existing one is a defect** — import and
  spread the source (`INLINE_COMPONENTS` into `EXCLUDED_TAGS`, #1361). Seven hand-edited
  micromark extension arrays missing one is the canonical failure (#1568 → CX-3708).
- 🟡 **DRY into `processor/utils.ts`** — overlapping eval logic dries up to a single function
  (#1429); "we definitely don't want two duplicates that could drift" (#1445).
- 🟡 **Delete dead code** — unused imports/vars/wrappers flagged constantly (#1420, #1482,
  #1539); no-op code removed, not commented out.
- 🟡 **Justify magic numbers** (CLAUDE.md); name for behavior, generalize the name when the logic
  is generic ("You could just call this `evaluate`" — #1429).

## TypeScript & types  ·  _all *.ts/*.tsx_

- 🔴 **No `as unknown as`, no cast chains.** Type the expected shape instead: extend the shared
  `Data` interface in `types.d.ts` (kills triple-casts across two repos, #1595), use the
  transitional shapes in `processor/transform/mdxish/types.ts` (#1445), or write a type guard
  (`child is Element`, #1351). "Can we better type this without using as unknown?" (#1371).
- 🔴 **`types.d.ts` is a cross-repo contract** — interfaces there (Embeds, Data, custom nodes)
  are consumed by the readme monorepo; changes must update the declaration file and be called
  out (#1376, #1488).
- 🟡 **`satisfies` over `as`** (CLAUDE.md, #1595); reuse library types (`Processor`,
  `React.ComponentType`, mdast/hast types via `import type`); narrow broad types
  (`Record<string, React.ComponentType>` over loose maps, #1470).
- 🟡 **`@ts-expect-error` with a reason — never `@ts-ignore`.** Don't cast AND wrap to satisfy
  the same type requirement (#1383).
- 🟡 **New code is TypeScript** — the 6 remaining `.js` source files are legacy, not precedent.

## Components, styling & a11y  ·  _components/**, styles/**, contexts/**, hooks/**_

- 🔴 **`useEffect` has a correct dependency array** (#1392 — "the one blocking comment").
- 🔴 **Compiled DOM and classnames are customer-styled API.** Retain existing markup/classes;
  add new capability additively (#1498 FA icons, CHANGES_REQUESTED).
- 🟡 **Component shape**: PascalCase dir, `index.tsx` (+ `style.scss` registered in
  `styles/components.scss`), arrow function component, local `interface Props`, default export,
  barrel-registered in `components/index.ts`; tag name matches the transformer's `hName`.
- 🟡 **Styling**: global SCSS (no CSS modules), `rdmd-`/`Component_modifier` class scheme,
  namespaced CSS custom properties (`--Callout-bg`) with legacy fallbacks, dark mode via
  `when-color-mode-dark`. Don't consume monorepo design-system variables the standalone package
  won't have ("Def a code smell" — #1392); use the package's own tokens (#1388, #1491).
- 🟡 **SSR-safe**: browser-only deps behind `typeof window` dynamic import + `useHydrated`
  (Code/syntax-highlighter pattern).
- 🟡 **No mutable module-scope state in components** — modules build once and never reset; use a
  ref (#1385).
- 🟡 **a11y**: prefer native semantics (`<dialog>` over hand-rolled focus traps — leaky focus,
  background scroll, no focus return, #1571); no redundant ARIA (`role="navigation"` on `<nav>`,
  #1392); don't duplicate `alt`/title text so screen readers announce twice (#1571).
- 🟡 **Contexts over prop-drilling** for render options; compose in `contexts/index.tsx`.

## Security & sanitization  ·  _safeMode, sanitize.schema.js, evaluate, dangerous-html_

- 🔴 **`safeMode` never evaluates.** No `eval`/`new Function` reachable when safe mode is on;
  demand the negative test ("Do we have good test coverage to make sure we aren't evaluating any
  thing when safe mode is on?" — #1429, #1386). The one sanctioned `new Function` lives in
  `processor/utils.ts` `evaluate` with its ☢️ Danger JSDoc — keep that framing on anything new.
- 🔴 **Dangerous-tag/attr handling must be complete.** Adding `object`/`applet` without `embed`
  is a gap; verify spread attributes (`{...{onclick: 'alert(1)'}}`) don't survive sanitization
  (#1526). `sanitize.schema.js` stays safeMode-aware (`style` only when safe mode off).
- 🔴 **`run` evals compiled MDX** (README caution) — anything widening what reaches `run`, or
  loosening the sanitize schema, is a security review.
- 🟡 **Parse untrusted input defensively** — `.parse` outside a try/catch is "sketchy" (#1402);
  answer sanitization questions concretely ("Does the `Anchor` component actually sanitize
  this?" — #1361, re-asked after a thread was resolved without an answer).

## Performance & bundle size

- 🔴 **Heavy browser deps are lazy-loaded.** A statically-imported ~124kb lightbox library ships
  on every markdown render — split it out and lazy-load like mermaid (#1571); mermaid's
  laziness is guarded by `verify-lazy-mermaid.cjs` and the `'import mermaid'` webpack external.
  bundlewatch budgets (main.js ≤ 1MB, main.node.js ≤ 990KB, render-diff ≤ 185KB) are enforced on
  every push.
- 🟡 **Module-scope invariants** — regexes, Sets, processors, extension arrays built once, not
  per call/per node/per recursion (#1477, #1583, #1476, #1461); memoize or reuse the
  module-level singleton processor instead of instantiating per call (#1449).
- 🟡 **Question payload/package size** — a 4MB fixture entry means consumers install 4MB
  (#1489); keep published artifacts lean.

## Backwards compatibility & cross-repo blast radius

- 🔴 **Breaking engine changes ship with the consumer-side PR ready** — an engine-first merge
  can crash the editor (#1470); coordinate monorepo/editor landing order.
- 🔴 **Deep-import paths and `exports` subpaths are public API** — `files` ships raw `styles/`
  and `components/`; `./render-diff` and `./render-fixture` have downstream consumers. Renames
  and moves there are breaking changes.
- 🔴 **Pin parser-pipeline deps whose bumps change AST shape** — `micromark-util-subtokenize`
  pinned to 2.0.4 with a comment because the newer version rewraps list items (#1578); any
  micromark/remark/rehype bump needs a behavior audit.
- 🟡 **Widening/narrowing an existing check needs the original regression's history** — "want to
  make sure we aren't regressing the behavior that led to the check being added" (#1421); large
  blast-radius type changes get challenged (#1473).
- 🟡 **`plain()` strips all inline markdown** — never run user subcontent through it where
  links/emphasis must survive (#1362).
- 🟡 **Second approval from readme-eng** when the change alters monorepo-visible behavior
  (#1506).

## Testing  ·  ___tests__/**_ — findings here ARE reportable in this repo

- 🔴 **The test must fail without the fix.** No pre-escaped inputs that pass anyway (#1544); no
  parameterized suites green with zero overrides (#1559); cover the marker family the fix is
  about — a `*`-only suite leaves the `_` path untested (#1594). Removed/skipped assertions need
  an explanation (#1452).
- 🔴 **Perf tests assert ratios relative to input size, never wall-time** — hard thresholds fail
  on non-CI hardware (#1578).
- 🔴 **Visual snapshots come from CI** — `make ci` in Docker, download the artifact, `make
  updateSnapshot`; local renders differ by font stack (CONTRIBUTING.md).
- 🟡 **Edge-case matrix on parser changes**: nested inside Callout/Tabs/Accordion (#1597, #1371),
  inside HTMLBlock/blockquotes/comments/custom components (#1574), back-to-back instances,
  multi-line attributes, `**`/`__` vs `*`/`_`, escapes, blank-line/indentation variants
  (CommonMark rules make formatting variations first-class cases — CLAUDE.md).
- 🟡 **Both engines**: fork shared tests across mdx and mdxish (#1384, #1488); the
  equivalence suite exists for exactly this.
- 🟡 **Assert full expected output** — full markdown/HTML string or `toMatchObject` on the AST,
  not `toContain`/length (#1383, #1439, #1376).
- 🟡 **Bug fixes add a regression fixture** — `__tests__/regression/fixtures/<name>/` with
  `body.md` + `context.json` (+ optional `components/*.mdx`), README citing the PR/ticket
  (#1538, #1386; fixtures README is the authoring source of truth). Real problematic customer
  docs become fixtures.
- 🟡 **Placement & hygiene**: vitest unit tests centralized under `__tests__/` by concern
  (transformer tests in `__tests__/transformers/`, compiler tests in `__tests__/compilers/` —
  #1439); reuse shared helpers (`execute`, `silenceConsole`, `renderingEngines` — #1574);
  inline AST snapshots with positions stripped (`toStrictEqualExceptPosition`); one wrapping
  `describe`; test descriptions stay general — no customer names (#1597).

## Errors & silent failure

- 🟡 **Don't fail silently** — `console.warn` with context instead of swallowing ("Is there an
  appropriate way to surface a warning … instead of silently swallowing it?" — #1470; "is it
  safe to just silently drop this?" — #1451). Use `silenceConsole` in tests so intentional
  warnings stay assertable.

## Comments & documentation

- 🟡 **Comments explain WHY, not what** (#1426); ≤ ~2 lines, sparse, and accurate — stale
  comments referencing renamed functions get flagged (#1583).
- 🟡 **JSDoc every transformer and dense/regex logic**, including pipeline-stage notes ("only
  emitting the tokenized `MdxComponent` as an opaque `html` node at this stage" — #1426) and a
  finding trail with source links for reverse-engineered behavior (#1385).
- 🟡 **Never delete existing JSDoc in passing** (#1419); no placeholder/LLM-artifact/scratch
  comments ("Remove the 'Dimas feedback' texts" — #1428).

## Naming & file placement

- 🟡 Name at the right altitude — generalize when logic is generic (`evaluate`, #1429), narrow
  when it isn't (an Images-only interface shouldn't sound general — #1473); descriptive variable
  names (#1474); non-magic-block types don't live in the magic-blocks folder (#1409); group
  related translators under a dedicated dir (`lib/translate/…`, #1473).

## Dependencies, build & release

- 🔴 **`package-lock.json` committed with every dep change** (#1470).
- 🔴 **Webpack externals/exports guards stay green** — `build:verify` (verify-exports,
  verify-lazy-mermaid) and bundlewatch are release gates; peer-dep moves (syntax-highlighter)
  are `feat!` breaking changes.
- 🟡 **Angular commit convention with engine scopes** — `feat(mdxish):`, `fix(editor):`;
  `!`/`BREAKING` for majors. Note the custom release rules: **`refactor` releases a minor**,
  `chore(deps)` a patch (.releaserc).
- 🟡 **Merge mechanics**: never squash-merge a main→next merge PR (#1514).

## Git, PR & process

- 🔴 **Never resolve a review thread without answering the question** — an unanswered resolved
  thread shipped a production regression (RM-15705, #1361).
- 🟡 **PR description says what changed and links the right ticket** (#1500, #1469); unrelated
  changes split out (#1368); QA evidence (playground/demo repro links, screenshots/video) for
  render-visible changes — reviewers QA locally against a monorepo clone and CHANGES_REQUEST on
  repro'd regressions (#1465, #1591, #1371).
