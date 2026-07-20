# `@readme/markdown`

This repo contains two Markdown processing engines, both built on top of Unified.js + Remark.

## RMDX

A strict MDX processor written on top of Unified.js + Remark. RMDX handles standard Markdown + GFM, as well as ReadMe's flavored custom syntax. Because it is an MDX-first processor, all RMDX-processed docs must adhere to strict JSX syntax rules. (See @lib/mdx.ts)

## MDXish (aka Xish)

The Xish processor supports standard Markdown with GFM extensions, as well as ReadMe's flavored syntax. This engine also supports a subset of MDX functionality (specifically custom components and logical expressions) without requiring strict JSX compliance. (See @lib/mdxish.ts)

### Further Context

- @.claude/context/MDXish/Processor Overview.md
- @.claude/context/MDXish/Supported Syntax.md

## Code & Architecture Conventions

Follow these unless there's a clear reason not to.

**Architecture**

- **Never fork the pipeline by consumer.** The `newEditorTypes` flag (editor-vs-renderer branching) is tech debt — both should share one AST. Don't add consumer-conditional plugins/branches; fix the shared node shape instead.
- **The engine owns its transforms; consumers don't pre-process.** No app-side normalization the pipeline should do itself (e.g. resolving `<<var>>` before mdxish).
- **Parse with tokenizers/AST, not string hacks.** Prefer micromark tokenizers and real MDAST/HAST/ESTree nodes over regexing source, sentinel swaps, or extract-then-restore workarounds. Walk an AST instead of regexing serialized JSON/HTML, and emit the correct node type rather than re-encoding to another syntax.
- **Match legacy / `mdx-js` behavior; change minimally.** Reference the `v6` branch parsers for parity, call out unrelated changes, and avoid adding special-case behaviors.

**Code style**

- **Hoist invariants to module scope** — regexes, constants, interfaces, and `unified()` processors must never be recreated per call or per visited node.
- **DRY across the repo.** Extract shared logic into `processor/utils.ts`; reuse existing helpers and libraries (`micromark-util-*`, syntax-tree utils, the `v6` parsers) over hand-rolling; delete dead code.
- **Types** Prefer `satisfies` over `as`; reuse existing/library types (`Processor`, `React.ComponentType`, `types.d.ts`) instead of redeclaring; narrow broad types; use type guards (`x is T`).
- **Name for behavior;** generalize a name when its logic is generic.
- **Comments explain _why_ and stay accurate** as code changes. JSDoc every transformer and any dense/regex logic. No placeholder, stale, or LLM-artifact comments.
- **Don't fail silently** — `console.warn` rather than swallow errors; justify magic-number limits.
- **Never `eval` or execute in `safeMode`;**

**Testing**

- **Unit-test dense logic directly**, not only through a consumer; new transformers need coverage.
- **Cover both engines and edge cases** — fork shared tests across mdx/mdxish; exercise `**`/`__` and `*`/`_`, escapes, nesting, and blank-line/whitespace cases. Don't `skip` tests without explanation.
- **Add a regression test with bug fixes** — reproduce the bug and its edge cases, and cite the ticket/issue so it can't silently return.
