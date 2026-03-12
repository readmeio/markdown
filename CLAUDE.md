# `@readme/markdown`

This repo contains two Markdown processing engines, both built on top of Unified.js + Remark.

## RMDX

A strict MDX processor written on top of Unified.js + Remark. RMDX handles standard Markdown + GFM, as well as ReadMe's flavored custom syntax. Because it is an MDX-first processor, all RMDX-processed docs must adhere to strict JSX syntax rules. (See @lib/mdx.ts)

## MDXish (aka Xish)

The Xish processor supports standard Markdown with GFM extensions, as well as ReadMe's flavored syntax. This engine also supports a subset of MDX functionality (specifically custom components and logical expressions) without requiring strict JSX compliance. (See @lib/mdxish.ts)

### Further Context

- @.claude/context/MDXish/Processor Overview.md
- @.claude/context/MDXish/Supported Syntax.md
