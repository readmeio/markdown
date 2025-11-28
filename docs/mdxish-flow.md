# MDXish Function Flow

## Overview

The `mdxish` function processes markdown content with MDX-like syntax support, detecting and rendering custom component tags from a components hash. It returns a HAST (Hypertext Abstract Syntax Tree).

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INPUT: Raw Markdown                               │
│            "# Hello {user.name}\n<Callout>**Bold**</Callout>"               │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 1: Load Components                                                    │
│  ─────────────────────────────────────────────────────────────────────────  │
│  loadComponents() → Loads all React components from components/index.ts     │
│  Merges with user-provided components (user overrides take priority)        │
│  Result: { Callout, Code, Tabs, ... }                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 2: Pre-process JSX Expressions                                        │
│  ─────────────────────────────────────────────────────────────────────────  │
│  preprocessJSXExpressions(content, jsxContext)                              │
│                                                                             │
│  1. Extract & protect code blocks (```...```) and inline code (`...`)       │
│  2. Remove JSX comments: {/* comment */} → ""                               │
│  3. Evaluate attribute expressions: href={baseUrl} → href="https://..."     │
│  4. Evaluate inline expressions: {5 * 10} → 50                              │
│  5. Restore protected code blocks                                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      UNIFIED PIPELINE (AST Transformations)                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        │                             │                             │
        ▼                             │                             │
┌───────────────────┐                 │                             │
│  remarkParse      │                 │                             │
│  ───────────────  │                 │     REMARK PHASE            │
│  Parse markdown   │                 │     (MDAST - Markdown AST)  │
│  into MDAST       │                 │                             │
└───────────────────┘                 │                             │
        │                             │                             │
        ▼                             │                             │
┌───────────────────┐                 │                             │
│  remarkFrontmatter│                 │                             │
│  ───────────────  │                 │                             │
│  Parse YAML       │                 │                             │
│  frontmatter      │                 │                             │
│  (metadata)       │                 │                             │
└───────────────────┘                 │                             │
        │                             │                             │
        ▼                             │                             │
┌────────────────────┐                │                             │
│defaultTransformers │                │                             │
│  ───────────────   │                │                             │
│  1. callout        │                │                             │
│  2. codeTabs       │                │                             │
│  3. image          │                │                             │
│  4. gemoji         │                │                             │
└────────────────────┘                │                             │
        │                             │                             │
        ▼                             │                             │
┌───────────────────┐                 │                             │
│  remarkGfm        │                 │                             │
│  ───────────────  │                 │                             │
│  GitHub Flavored  │                 │                             │
│  Markdown support:│                 │                             │
│  - Tables         │                 │                             │
│  - Strikethrough  │                 │                             │
│  - Task lists     │                 │                             │
│  - Autolinks      │                 │                             │
│  - Footnotes      │                 │                             │
└───────────────────┘                 │                             │
        │                             │                             │
        ▼                             │                             │
┌────────────────────┐                │                             │
│mdxishComponentBlocks                │                             │
│  ───────────────── │                │                             │
│  Re-wraps HTML     │                │                             │
│  blocks like       │                │                             │
│  <Callout>text     │                │                             │
│  </Callout> into   │                │                             │
│  mdxJsxFlowElement │                │                             │
└────────────────────┘                │                             │
        │                             │                             │
        ▼                             │                             │
┌───────────────────┐                 │                             │
│ embedTransformer  │                 │                             │
│  ───────────────  │                 │                             │
│  [label](url      │                 │                             │
│    "@embed")      │                 │                             │
│  Converts embed   │                 │                             │
│  links to         │                 │                             │
│  embedBlock nodes │                 │                             │
└───────────────────┘                 │                             │
        │                             │                             │
        ▼                             │                             │
┌─────────────────────┐               │                             │
│variablesTextTransformer             │                             │
│  ─────────────────  │               │                             │
│  Parses {user.*}    │               │                             │
│  patterns from text │               │                             │
│  using regex →      │               │                             │
│  <Variable          │               │                             │
│    name="field"/>   │               │                             │
└─────────────────────┘               │                             │
        │                             │                             │
        ▼                             │                             │
┌───────────────────┐                 │                             │
│tailwindTransformer│                 │                             │
│  ───────────────  │                 │                             │
│  (conditional)    │                 │                             │
│  Processes        │                 │                             │
│  Tailwind classes │                 │                             │
│  in components    │                 │                             │
└───────────────────┘                 │                             │
        │                             │                             │
        └─────────────────────────────┼─────────────────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        │                             │                             │
        ▼                             │                             │
┌───────────────────┐                 │                             │
│  remarkRehype     │                 │     CONVERSION              │
│  ───────────────  │                 │     MDAST → HAST            │
│  Convert MDAST    │                 │                             │
│  to HAST with     │                 │                             │
│  mdxComponentHandlers               │                             │
│  (preserves MDX   │                 │                             │
│   elements)       │                 │                             │
└───────────────────┘                 │                             │
        │                             │                             │
        └─────────────────────────────┼─────────────────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        │                             │                             │
        ▼                             │                             │
┌───────────────────┐                 │                             │
│  rehypeRaw        │                 │     REHYPE PHASE            │
│  ───────────────  │                 │     (HAST - HTML AST)       │
│  Parse raw HTML   │                 │                             │
│  strings in AST   │                 │                             │
│  into proper HAST │                 │                             │
│  elements         │                 │                             │
└───────────────────┘                 │                             │
        │                             │                             │
        ▼                             │                             │
┌───────────────────┐                 │                             │
│  rehypeSlug       │                 │                             │
│  ───────────────  │                 │                             │
│  Add IDs to       │                 │                             │
│  headings for     │                 │                             │
│  anchor linking   │                 │                             │
│  # Title →        │                 │                             │
│  <h1 id="title">  │                 │                             │
└───────────────────┘                 │                             │
        │                             │                             │
        ▼                             │                             │
┌────────────────────┐                │                             │
│rehypeMdxishComponents               │                             │
│  ───────────────── │                │                             │
│  Final pass:       │                │                             │
│  1. Skip standard  │                │                             │
│     HTML tags      │                │                             │
│  2. Skip runtime   │                │                             │
│     tags like Variable              │                             │
│  3. Match custom   │                │                             │
│     components     │                │                             │
│  4. Convert props  │                │                             │
│     to camelCase   │                │                             │
│  5. Recursively    │                │                             │
│     process text   │                │                             │
│     children as MD │                │                             │
│  6. Remove unknown │                │                             │
│     components     │                │                             │
└────────────────────┘                │                             │
        │                             │                             │
        └─────────────────────────────┼─────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           OUTPUT: HAST Tree                                 │
│                                                                             │
│  {                                                                          │
│    type: 'root',                                                            │
│    children: [                                                              │
│      { type: 'element', tagName: 'h1', properties: { id: 'hello' }, ... },  │
│      { type: 'element', tagName: 'Callout', properties: {...}, children: [  │
│        { type: 'element', tagName: 'strong', children: ['Bold'] }           │
│      ]}                                                                     │
│    ]                                                                        │
│  }                                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Pipeline Summary

| Phase | Plugin | Purpose |
|-------|--------|---------|
| Pre-process | `preprocessJSXExpressions` | Evaluate `{expressions}` before parsing |
| MDAST | `remarkParse` | Markdown → AST |
| MDAST | `remarkFrontmatter` | Parse YAML frontmatter (metadata) |
| MDAST | `defaultTransformers` | Transform callouts, code tabs, images, gemojis |
| MDAST | `mdxishComponentBlocks` | PascalCase HTML → `mdxJsxFlowElement` |
| MDAST | `embedTransformer` | `[label](url "@embed")` → `embedBlock` nodes |
| MDAST | `variablesTextTransformer` | `{user.*}` → `<Variable>` nodes (regex-based) |
| MDAST | `tailwindTransformer` | Process Tailwind classes (conditional, if `useTailwind`) |
| MDAST | `remarkGfm` | GitHub Flavored Markdown: tables, strikethrough, task lists, autolinks, footnotes |
| Convert | `remarkRehype` + handlers | MDAST → HAST |
| HAST | `rehypeRaw` | Raw HTML strings → HAST elements |
| HAST | `rehypeSlug` | Add IDs to headings |
| HAST | `rehypeMdxishComponents` | Match & transform custom components |

## Entry Points, Plugins and Utilities

```
┌───────────────────────────────────────────────────────────────────┐
│                         ENTRY POINTS                              │
├───────────────────────────────────────────────────────────────────┤
│  mdxish(md) → HAST            Main processor                      │
│  mix(md) → string             Wrapper that returns HTML string    │
│  renderMdxish(hast) → React   Converts HAST to React components   │
└───────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────┐
│                      PIPELINE PLUGINS                             │
├───────────────────────────────────────────────────────────────────┤
│  rehypeMdxishComponents      ← Core component detection/transform │
│  mdxishComponentBlocks       ← PascalCase HTML → MDX elements     │
│  mdxComponentHandlers        ← MDAST→HAST conversion handlers     │
│  defaultTransformers         ← callout, codeTabs, image, gemoji   │
│  embedTransformer            ← Embed links → embedBlock nodes     │
│  variablesTextTransformer    ← {user.*} → Variable (regex-based)  │
│  tailwindTransformer         ← Process Tailwind classes (opt-in)  │
└───────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────┐
│                         UTILITIES                                 │
├───────────────────────────────────────────────────────────────────┤
│  utils/html-tags.ts          ← STANDARD_HTML_TAGS, etc.           │
│  lib/utils/load-components   ← Auto-loads React components        │
│  lib/utils/mix-components    ← componentExists() lookup           │
│  lib/utils/render-utils      ← Shared render utilities            │
└───────────────────────────────────────────────────────────────────┘
```

## Embeds

The `embedTransformer` converts special markdown links into embed blocks. The syntax uses the `@embed` title marker:

```markdown
[Video Title](https://youtube.com/watch?v=abc "@embed")
```

This creates an `embedBlock` node with:
- `url` - the embed URL
- `title` - the link label (e.g., "Video Title")
- `hName: 'embed'` - renders as `<Embed>` component

## User Variables

The `variablesTextTransformer` parses `{user.<field>}` patterns directly from text nodes using regex (without requiring `remarkMdx`). Supported patterns:

- `{user.name}` → dot notation
- `{user.email}`
- `{user.email_verified}`
- `{user['field']}` → bracket notation with single quotes
- `{user["field"]}` → bracket notation with double quotes

All user object fields are supported: `name`, `email`, `email_verified`, `exp`, `iat`, `fromReadmeKey`, `teammateUserId`, etc.
