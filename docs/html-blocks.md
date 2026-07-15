---
title: HTML Blocks
category:
  uri: uri-that-does-not-map-to-5fdf7610134322007389a6ed
privacy:
  view: public
---

## Overview

`<HTMLBlock>` embeds a raw block of HTML in a page. Unlike inline HTML, its body is treated as an **opaque string** — the Markdown/MDX processor does not parse
what's inside it, so tags that would otherwise be interpreted as JSX (or split apart by other tokenizers) are rendered verbatim.

This makes it the right tool for pasting hand-written HTML/CSS snippets that don't need to play by strict JSX rules — most commonly a `<style>` block or a raw `<table>`.

## Syntax

The body **must** be wrapped in a template-literal expression — `` {`...`} `` — so the processor keeps it opaque:

```markdown
<HTMLBlock>{`
<div class="callout">Hello, world!</div>
`}</HTMLBlock>
```

### Attributes

| Attribute    | Type              | Description                                                             |
| :----------- | :---------------- | :---------------------------------------------------------------------- |
| `runScripts` | `boolean`         | When `true`, `<script>` tags inside the block are executed on the client. |
| `safeMode`   | `boolean`         | When `true`, the HTML is escaped and shown as source instead of rendered. |

```markdown
<HTMLBlock runScripts={true}>{`
<script>console.log('hi from an HTMLBlock')</script>
`}</HTMLBlock>
```

## Simple examples

### A styled box

<HTMLBlock>{`
<div style="padding: 12px; border: 1px solid #0062df; border-radius: 8px;">
  A raw HTML box.
</div>
`}</HTMLBlock>

### A `<style>` block

Scoped styles are a common use case. The template literal keeps the CSS braces from being mistaken for MDX expressions:

<HTMLBlock>{`
<style> .demo { color: #0062df; } </style>
<div class="demo">This should be coloured</div>
`}</HTMLBlock>

### A `<style>` block

Scoped styles are a common use case. The template literal keeps the CSS braces from being mistaken for MDX expressions:

```markdown
<HTMLBlock>{`
<style> .demo { color: #0062df; } </style>
`}</HTMLBlock>
```

## Complex examples

The following snippets are ones that historically broke the page — either by crashing the whole document or by mangling the content. 
They now render correctly because the `<HTMLBlock>` body is captured as a single opaque token before any other tokenizer (tables, `<style>`, etc.) can fragment it.

### A raw `<table>` inside a block

Before, the table tokenizer would lift the inner `<table>` out of the block, handing `<HTMLBlock>` non-string children and crashing the page. 
It now stays inside the block as raw HTML:

<HTMLBlock>{`
<table><tr><td>hello</td></tr></table>
`}</HTMLBlock>

### A `<style>` + styled `<table>`

<HTMLBlock>{`
<style> .demo td { color: #0062df; } </style>
<table class="demo"><tr><td>styled cell</td></tr></table>
`}</HTMLBlock>

### A pretty-printed table with blank lines

Blank lines between rows used to collapse the table into a `<pre>` code block. The body is now preserved byte-for-byte:

<HTMLBlock>{`
<table>
  <thead>
    <tr><th>Country</th></tr>
  </thead>

  <tr>
    <td>Afghanistan</td>
  </tr>
</table>
`}</HTMLBlock>

## Gotchas

### Always wrap the body in `` {`...`} ``

A "bare" body — one that isn't wrapped in a template literal — is **not** treated as an HTML block. It falls back to being parsed like an ordinary component body:

```markdown
<!-- ✅ opaque HTML, rendered verbatim -->
<HTMLBlock>{`<strong>bold</strong>`}</HTMLBlock>

<!-- ⚠️ bare body — parsed, not treated as raw HTML -->
<HTMLBlock><strong>bold</strong></HTMLBlock>
```

A single-line bare body has its Markdown parsed; a multiline bare body is currently passed through unparsed. Wrapping the body in `` {`...`} `` avoids this ambiguity entirely.

### Escaping backticks

Because the body is a template literal, literal backticks inside it must be escaped with a backslash:

```markdown
<HTMLBlock>{`<code>const x = \`tpl\`;</code>`}</HTMLBlock>
```
