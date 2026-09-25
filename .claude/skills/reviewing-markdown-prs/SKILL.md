---
name: reviewing-markdown-prs
description: Use when reviewing a pull request, diff, or staged/working-tree change in the readmeio/markdown (@readme/markdown) repo — before approving or merging — to check it against the standards reviewers actually enforce there. Keywords: code review, PR review, readme markdown, RMDX, MDX, mdxish, Xish, remark, rehype, micromark, unified, mdast, hast, tokenizer, transformer, compile handler, hName, hProperties, NodeTypes, safeMode, sanitize, regression fixture, equivalence, both engines, bundlewatch, jest-puppeteer, visual snapshots, vitest.
---

# Reviewing @readme/markdown PRs

## Overview

Review changes to `readmeio/markdown` (**@readme/markdown** — ReadMe's React-based Markdown/MDX
parser, built on Unified.js: two engines, strict **RMDX** in `lib/mdx.ts` and lenient
**MDXish/Xish** in `lib/mdxish.ts`) against the standards **this team actually enforces**. This is
a parser + component library that ships into the readme monorepo and editor: the highest-value
checks are pipeline architecture (tokenizers/AST over regex band-aids), both-engine parity and
test matrices, backwards compatibility of compiled output, TypeScript rigor without casts, and
`safeMode` security.

**Severity (use these labels):** 🔴 **blocking** (change demanded) · 🟡 **should** (clear,
repeated preference). **There is no nit tier** — an observation that doesn't clear the 🟡 bar
(style preferences, equivalent rewrites, doc wording, micro-refactors) is dropped, not reported.
Every reported finding names the concrete consequence of leaving the code as-is.

**Testing findings ARE in scope in this repo.** Unlike some sibling repos, test rigor is the
single most-enforced standard here: reviewers demand edge-case matrices, both-engine coverage,
assertions that prove the fix, and regression fixtures. A missing or non-proving test on a parser
change is a real finding.

**Violating the letter of a standard is violating it — don't wave through a 🔴.**

## How to review

1. **Get the change.** Read the full diff — `gh pr diff <n>` for a PR, `git diff` /
   `git diff --staged` for local changes.
2. **Route each changed file** to the relevant standards (table below). Always run the repo-wide
   checks (Architecture/pipeline, Reuse, TypeScript, Comments).
3. **Run the probes** — Pipeline & parity and Compat/blast-radius on every diff, the Testing probe
   whenever parser/transformer behavior changes — plus the **red-flag scan**.
4. **Run matching sections** of `CHECKLIST.md` (complete list); cross-check `CLAUDE.md` at the
   repo root (authoritative) and `.claude/context/MDXish/` for engine semantics.
5. **Report findings** in the output format below; any unaddressed 🔴 ⇒ request changes.

| Changed file matches | Run these standard sets |
|----------------------|-------------------------|
| `lib/mdx.ts`, `lib/mdxish.ts`, `lib/compile.ts`, `lib/run.tsx` | **Architecture & pipeline**, Security (`run` evals!), Compat |
| `lib/micromark/**` (tokenizers) | **Parsing & tokenizers**, Performance (linear scans), Testing |
| `processor/transform/**`, `processor/plugin/**`, `processor/compile/**` | **Transformers & handlers**, Architecture, Testing |
| `processor/utils.ts`, `enums.ts`, `types.d.ts` | **Reuse & shared contracts** (types.d.ts is cross-repo API), TypeScript |
| `components/**`, `styles/**`, `contexts/**`, `hooks/**` | **Components, styling & a11y**, Performance (bundle), Compat (DOM/classnames are public API) |
| `sanitize.schema.js`, anything touching `safeMode`/`evaluate` | **Security & sanitization** |
| `__tests__/**`, `vitest.*`, `jest.config.js`, `Makefile` | **Testing** |
| `webpack.*.js`, `package.json`, `.releaserc`, `babel.config.js` | **Dependencies, build & release** (bundlewatch, externals, exports map) |
| `.github/workflows/**` | CI & release process, Security |
| every `*.ts`/`*.tsx` | TypeScript & types, Reuse, Naming, Comments |

## Pipeline & parity probe (the distinctive core of this repo)

- **Parse with tokenizers and AST, never string hacks.** 🔴 Flag regex-on-source, sentinel
  swap/protect-and-restore passes, extract-then-restore workarounds, regexing serialized
  JSON/HTML, or manual line-by-line scanning where a micromark tokenizer, `unist-util-visit`
  walk, estree walk, or an existing util (`hast-util-to-html`, `micromark-util-character`,
  htmlparser2-style tag walker) does it structurally. Reviewers reject these even when they work
  ("bad architecture to address bad architecture compounds problems").
- **Never fork the pipeline by consumer.** 🔴 The `newEditorTypes` flag is frozen tech debt; no
  new consumer-conditional plugins/branches — fix the shared node shape instead. The engine owns
  its transforms; consumers never pre-process (no app-side `<<var>>` resolution).
- **Both engines, always.** A behavior added or fixed in one engine needs the mdx AND mdxish
  story stated: does the other engine need the same change, and do tests cover both (🔴 for
  silent divergence, 🟡 for missing coverage)?
- **Match legacy/`mdx-js` behavior; change minimally.** Reference the `v6` branch parsers and
  mdx-js semantics for parity; a deliberate divergence needs calling out in the PR (🟡). New
  flags/options are resisted — if the new behavior matches legacy, make it the default, no flag
  (🟡).
- **Emit the correct node type** — custom node type strings come from `enums.ts` `NodeTypes`,
  never inline literals; mdast→hast bridging goes through `data.hName`/`hProperties` matching a
  registered component (🔴).
- **Tokenizer ordering is semantic and must be documented.** A new micromark extension or
  transformer inserted into a pipeline needs a comment saying why it sits where it sits (e.g.
  `jsxComment` must claim `{/* … */}` before `magicBlock`); `lib/mdxish.ts`'s ordered
  pipeline-steps comment must be updated when steps change (🟡).
- **Hoist invariants to module scope.** Regexes, Sets, `unified()` sub-processors, and
  `toMarkdown` extension arrays are built once — never per call or per visited node (🟡, 🔴 when
  it recurses per nested component).
- **Repair passes must never lose content.** mdxish exists to tolerate invalid MDX: an unclosed
  tag or failed strict parse must degrade to visible content, not swallow everything after it —
  bail out rather than guess on implicit closes (🔴).
- **`visit` returns the named constants** (`SKIP`/`CONTINUE`/`EXIT`) with a why-comment, not bare
  magic values (🟡).

## Compat & blast-radius probe — run on every diff

The engine ships into readmeio/readme (monorepo + both editors); the compiled output is customer-
visible API:

- **Compiled DOM and classnames are public API** — customers style against them. Changing
  existing markup/classes is 🔴 unless additive; retain existing output and add new behavior
  alongside.
- **`types.d.ts` (and `processor/transform/mdxish/types.ts`) is a cross-repo contract** — the
  readme monorepo reads these types. Interface changes there must be flagged and coordinated;
  extending the shared `Data` interface beats casting in two repos (🔴 for silent changes).
- **Deep-import paths are public.** `files` ships raw `styles/` and `components/` — moving or
  renaming anything there, or changing `exports` subpaths (`render-diff`, `render-fixture`),
  is a breaking-change hazard (🔴).
- **Breaking engine changes need the consumer-side PR ready** (editor/monorepo) before the engine
  side merges (🔴). Engine PRs touching monorepo behavior want a readme-side approval too (🟡).
- **Bundle budgets are enforced** (bundlewatch: main.js ≤ 1MB). A dependency that ships to the
  browser bundle for a rarely-used feature must be lazy-loaded behind a dynamic import like
  mermaid is — check the webpack externals and `verify-lazy-mermaid` guard (🔴).
- **Dependency bumps inside the parser pipeline change AST shapes.** A micromark/remark/rehype
  version bump needs a behavior audit; pin (with a comment) when the newer version changes
  positions/wrapping (🔴).
- **Watch `plain()`** — it strips ALL inline markdown; using it on user subcontent breaks
  links/emphasis (🔴).

## Testing probe — run whenever parser/transformer/component behavior changes

- **The edge-case matrix**: new syntax handling needs tests for content nested inside components
  (Callout/Tabs/Accordion), tables, HTMLBlock, blockquotes, comments; back-to-back instances;
  `**`/`__` vs `*`/`_`; escapes; blank-line/indentation variants (🟡, 🔴 when the untested case
  is the bug class the PR fixes).
- **Both engines**: fork shared tests across mdx and mdxish (🟡).
- **Assert full expected output** — full markdown/HTML string or `toMatchObject` on the AST, not
  `toContain`/length checks (🟡).
- **The test must fail without the fix.** Feed raw (not pre-escaped) input; a parameterized suite
  that passes with zero overrides proves nothing (🔴 — the test lies about coverage).
- **Bug fixes need a regression fixture** under `__tests__/regression/fixtures` (`body.md` +
  `context.json` + README citing the PR/ticket) so the equivalence + snapshot suites pick it up
  (🟡).
- **Perf tests assert ratios, not wall-time** — hard ms thresholds fail on other hardware (🔴).
- **Visual snapshots come from CI artifacts** (`make ci`, download, `make updateSnapshot`) —
  never locally rendered (🔴).
- **No unexplained `skip`/removed assertions** — "Why are you skipping these?" is a standing
  reviewer question (🟡).

## Red flags — grep-able, high-yield catches

| Signal in the diff | Standard (severity) |
|--------------------|---------------------|
| `.replace(`/`.match(` on raw source where a tokenizer/AST walk exists; sentinel placeholder constants | Tokenizers/AST, not string hacks (🔴) |
| new `newEditorTypes` branch or other consumer-conditional pipeline fork | Fix the shared node shape instead (🔴) |
| inline `'rdme-callout'`-style type string literal | Use `enums.ts` `NodeTypes` (🔴) |
| `new RegExp(`/`unified()` inside a visitor or per-call function body | Hoist invariants to module scope (🟡/🔴) |
| `as unknown as`, chained `as`, `@ts-ignore` | Type the shape (`types.d.ts`, transitional types file), type guards, `satisfies`; `@ts-expect-error` + reason only (🔴 for `as unknown`) |
| copy of a helper that exists in another tokenizer/transform; a second list that must stay in sync with an existing one | One shared helper in `processor/utils.ts` / import + spread the source list (🟡, 🔴 on third copy) |
| `eval`/`new Function` reachable when `safeMode` is on; sanitize schema loosened | safeMode never evaluates; test the safe-mode path (🔴) |
| new dangerous-tag/attr handling missing a sibling vector (`object` but not `embed`; spread attrs surviving sanitize) | Complete the vector set (🔴) |
| silent `catch {}` / silently dropped node | `console.warn` with context, or surface the error (🟡) |
| new heavy dependency imported statically from a component | Lazy-load behind dynamic import (mermaid pattern); bundlewatch will break (🔴) |
| changed classnames/DOM structure of an existing component's output | Additive only — compiled markup is customer-styled API (🔴) |
| interface change in `types.d.ts` with no mention of monorepo/editor impact | Cross-repo contract — coordinate (🔴) |
| micromark/remark dep bump without behavior audit; unpinned pipeline dep with known AST drift | Audit + pin with comment (🔴) |
| new option/flag on `MdxishOpts` for behavior that could just be the default | No flags unless absolutely necessary (🟡) |
| test using `toContain`/`.length` on parser output | Full-output assertion (🟡) |
| test input pre-escaped / suite green with zero overrides | Test must fail without the fix (🔴) |
| bug-fix PR with no `__tests__/regression/fixtures` entry | Add the fixture (🟡) |
| perf test asserting absolute ms | Assert ratios (🔴) |
| `it.skip`/deleted test without explanation | Justify or restore (🟡) |
| `useEffect` missing dependency array; hand-rolled focus trap; duplicated `alt` | React/a11y standards (🔴 for missing deps) |
| mutable module-scope state in a component file | React ref/state — modules never reset (🟡) |
| utility functions living in `processor/transform/`; over-general or over-specific name | Files in transform/ export transformers; name at the right altitude (🟡) |
| "Dimas feedback"-style scratch text, debug logs, unused imports, unrelated diffs | PR hygiene — remove/split (🟡) |
| dep change without `package-lock.json` | Commit the lockfile (🔴) |
| comment restating *what*; stale comment contradicting renamed code; deleted JSDoc | Comments say why, stay accurate; JSDoc every transformer (🟡) |
| a resolved review thread whose question was never answered | Never resolve without answering — caused a prod regression (🔴) |

## Output format

Group findings by severity, most severe first. For each finding, show the relevant diff so the
flagged code is visible inline:

````text
🔴 <file>:<line> — <the standard, as an imperative>
   ```diff
   + <the added/changed line(s) this finding flags — use `-` for a problematic removal>
   ```
   Why: <1 line>
   Fix: <concrete suggestion — name the canonical helper/util/pattern>
````

Quote only the **minimal relevant hunk** — the few lines each finding points at. Never paste the
whole diff or unchanged code.

Then a verdict: **Request changes** (any unaddressed 🔴) / **Approve** (🟡s noted for the
author). Be specific; don't pad with praise.

## Common mistakes (reviewer pitfalls)

- **Accepting a working regex band-aid.** The repo's loudest standard: reviewers reject
  regex/sentinel/preprocess fixes even when they pass tests — ask for the tokenizer/AST version
  or an explicit acknowledgment of the debt.
- **Reviewing one engine.** Every parser behavior question is really two questions (mdx AND
  mdxish), and legacy/v6 parity is the tie-breaker. Silent divergence is how editor regressions
  ship.
- **Trusting a green test.** Check what the assertion proves: pre-escaped input, `toContain`, and
  zero-override parameterized suites all pass without the fix.
- **Missing the blast radius.** Compiled DOM/classnames, `types.d.ts`, deep-import scss paths,
  and `exports` subpaths are all consumed outside this repo — a "small" rename can break the
  monorepo, the editor, or customer CSS.
- **Treating `safeMode` as tested-elsewhere.** Any change near `evaluate`/sanitization needs the
  safe-mode-on negative test spelled out.
- **Generic advice.** If eslint/prettier/stylelint enforce it, skip it — spend budget on
  `CHECKLIST.md` judgment calls.
