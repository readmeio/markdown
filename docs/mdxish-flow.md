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
│  STEP 2: Normalize Table Separators                                         │
│  ─────────────────────────────────────────────────────────────────────────  │
│  normalizeTableSeparator(content)                                           │
│                                                                             │
│  Fixes malformed GFM table separator syntax that would prevent table        │
│  parsing. Must run before remark-parse to ensure tables are recognized.     │
│                                                                             │
│  Fixes:                                                                     │
│  - `|: ---` → `| :---`  (colon wrongly placed after pipe)                   │
│  - `|:---`  → `| :---`  (colon directly after pipe)                         │
│  - `|::---` → `| :---`  (double colon typo)                                 │
│  - `| ::---`→ `| :---`  (double colon with space)                           │
│                                                                             │
│  Result: string (normalized content)                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 3: Pre-process JSX Expressions                                        │
│  ─────────────────────────────────────────────────────────────────────────  │
│  preprocessJSXExpressions(content, jsxContext)                              │
│                                                                             │
│  0. Protect HTMLBlock content (base64 encode to prevent parser issues)      │
│  1. Extract & protect code blocks (```...```) and inline code (`...`)       │
│  2. Remove JSX comments: {/* comment */} → ""                               │
│  3. Evaluate attribute expressions: href={baseUrl} → href="https://..."     │
│  4. Restore protected code blocks                                           │
│                                                                             │
│  Note: Inline expressions ({5 * 10}) are now parsed by mdast-util-mdx-      │
│  expression and evaluated in the AST transformer (evaluateExpressions)      │
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
│  remarkParse      │                 │     REMARK PHASE            │
│  ───────────────  │                 │     (MDAST - Markdown AST)  │
│  Parse markdown   │                 │                             │
│  into MDAST with  │                 │                             │
│  micromark exts:  │                 │                             │
│  - magicBlock()   │                 │                             │
│  - mdxExpression()│                 │                             │
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
│normalizeEmphasisAST│                │                             │
│  ───────────────── │                │                             │
│  Fixes malformed   │                │                             │
│  bold/italic:      │                │                             │
│  ** bold** →       │                │                             │
│  **bold**          │                │                             │
└────────────────────┘                │                             │
        │                             │                             │
        ▼                             │                             │
┌─────────────────────┐               │                             │
│magicBlockTransformer│               │                             │
│  ───────────────────│               │                             │
│  Transforms parsed  │               │                             │
│  `magicBlock` MDAST │               │                             │
│  nodes (from micro- │               │                             │
│  mark tokenizer)    │               │                             │
│  into final nodes:  │               │                             │
│  images, callouts,  │               │                             │
│  code blocks, etc.  │               │                             │
└─────────────────────┘                │                             │
        │                             │                             │
        ▼                             │                             │
┌────────────────────┐                │                             │
│ imageTransformer   │                │                             │
│  ───────────────   │                │                             │
│  Converts inline   │                │                             │
│  images to image   │                │                             │
│  blocks. Preserves │                │                             │
│  magic block props │                │                             │
│  (width, align)    │                │                             │
└────────────────────┘                │                             │
        │                             │                             │
        ▼                             │                             │
┌────────────────────┐                │                             │
│defaultTransformers │                │                             │
│  ───────────────   │                │                             │
│  1. callout        │                │                             │
│  2. codeTabs       │                │                             │
│  3. gemoji         │                │                             │
│  4. embed          │                │                             │
│     [label](url    │                │                             │
│       "@embed")    │                │                             │
│     → embedBlock   │                │                             │
└────────────────────┘                │                             │
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
┌─────────────────────────┐           │                             │
│restoreSnakeCaseComponent│           │                             │
│Names ─────────────────  │           │                             │
│  Restores snake_case    │           │                             │
│  component names from   │           │                             │
│  placeholders:          │           │                             │
│  MDXishSnakeCase0 →     │           │                             │
│  <Snake_case />         │           │                             │
└─────────────────────────┘           │                             │
        │                             │                             │
        ▼                             │                             │
┌────────────────────┐                │                             │
│  mdxishTables      │                │                             │
│  ───────────────── │                │                             │
│  Converts <Table>  │                │                             │
│  JSX elements to   │                │                             │
│  markdown table    │                │                             │
│  nodes. Re-parses  │                │                             │
│  markdown in cells │                │                             │
│  (e.g., **Bold**)  │                │                             │
└────────────────────┘                │                             │
        │                             │                             │
        ▼                             │                             │
┌────────────────────┐                │                             │
│  mdxishHtmlBlocks  │                │                             │
│  ───────────────── │                │                             │
│  Transforms        │                │                             │
│  HTMLBlock MDX JSX │                │                             │
│  elements and      │                │                             │
│  template literal  │                │                             │
│  syntax to         │                │                             │
│  html-block nodes. │                │                             │
│  Decodes protected │                │                             │
│  base64 content.   │                │                             │
└────────────────────┘                │                             │
        │                             │                             │
        ▼                             │                             │
┌─────────────────────┐               │                             │
│evaluateExpressions  │               │                             │
│  ─────────────────  │               │                             │
│  Evaluates MDX      │               │                             │
│  expressions        │               │                             │
│  ({expression})     │               │                             │
│  using jsxContext   │               │                             │
│  and replaces with  │               │                             │
│  evaluated values   │               │                             │
└─────────────────────┘               │                             │
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
| Pre-process | `normalizeTableSeparator` | Fix malformed table separators (`|: ---`, `|::---` → `| :---`) |
| Pre-process | `preprocessJSXExpressions` | Protect HTMLBlock content, evaluate JSX attribute expressions (`href={baseUrl}`) |
| Pre-process | `processSnakeCaseComponent` | Replace snake_case component names with parser-safe placeholders |
| MDAST | `remarkParse` + micromark extensions | Markdown → AST with `magicBlock()` and `mdxExpression()` tokenizers |
| MDAST | `remarkFrontmatter` | Parse YAML frontmatter (metadata) |
| MDAST | `normalizeEmphasisAST` | Fix malformed bold/italic syntax (`** bold**` → `**bold**`) |
| MDAST | `magicBlockTransformer` | Transform parsed `magicBlock` nodes into final MDAST nodes (images, callouts, etc.) |
| MDAST | `imageTransformer` | Transform images to image blocks, preserve magic block properties |
| MDAST | `defaultTransformers` | Transform callouts, code tabs, gemojis, embeds |
| MDAST | `mdxishComponentBlocks` | PascalCase HTML → `mdxJsxFlowElement` |
| MDAST | `restoreSnakeCaseComponentNames` | Restore snake_case component names from placeholders |
| MDAST | `mdxishTables` | `<Table>` JSX → markdown `table` nodes, re-parse markdown in cells |
| MDAST | `mdxishHtmlBlocks` | `<HTMLBlock>{`...`}</HTMLBlock>` → `html-block` nodes |
| MDAST | `evaluateExpressions` | Evaluate MDX expressions (`{expression}`) using `jsxContext` |
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
│  normalizeTableSeparator     ← Fix malformed table separators     │
│  normalizeEmphasisAST        ← Fix malformed bold/italic syntax   │
│  magicBlockTransformer       ← Transform magicBlock nodes → MDAST │
│  imageTransformer            ← Images → imageBlock nodes          │
│  rehypeMdxishComponents      ← Core component detection/transform │
│  mdxishComponentBlocks       ← PascalCase HTML → MDX elements     │
│  restoreSnakeCaseComponentNames ← Restore snake_case components   │
│  mdxishTables                ← <Table> JSX → markdown tables      │
│  mdxishHtmlBlocks            ← <HTMLBlock> → html-block nodes     │
│  mdxComponentHandlers        ← MDAST→HAST conversion handlers     │
│  defaultTransformers         ← callout, codeTabs, gemoji, embed   │
│  variablesTextTransformer    ← {user.*} → Variable (regex-based)  │
│  tailwindTransformer         ← Process Tailwind classes (opt-in)  │
└───────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────┐
│                   MICROMARK EXTENSIONS                            │
├───────────────────────────────────────────────────────────────────┤
│  lib/micromark/magic-block   ← Tokenizer for [block:TYPE] syntax  │
│  lib/mdast-util/magic-block  ← Token → MDAST node converter       │
└───────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────┐
│                         UTILITIES                                 │
├───────────────────────────────────────────────────────────────────┤
│  utils/common-html-words.ts  ← STANDARD_HTML_TAGS, etc.           │
│  utils/load-components   ← Auto-loads React components            │
│  utils/mdxish/mdxish-get-component-name ← getComponentName()      │
│  utils/render-utils.tsx  ← Shared render utilities                │
└───────────────────────────────────────────────────────────────────┘
```
# Some Outstanding Transformers

## User Variables

The `variablesTextTransformer` parses `{user.<field>}` patterns directly from text nodes using regex (without requiring `remarkMdx`). Supported patterns:

- `{user.name}` → dot notation
- `{user.email}`
- `{user.email_verified}`
- `{user['field']}` → bracket notation with single quotes
- `{user["field"]}` → bracket notation with double quotes

All user object fields are supported: `name`, `email`, `email_verified`, `exp`, `iat`, `fromReadmeKey`, `teammateUserId`, etc.

## Tables

The `mdxishTables` transformer converts JSX Table elements to markdown table nodes and re-parses markdown content in table cells.

The old MDX pipeline relies on `remarkMdx` to convert the table and its markdown content into MDX JSX elements. Since mdxish does not use `remarkMdx`, we have to do it manually. The workaround is to parse cell contents through `remarkParse` and `remarkGfm` to convert them to MDX JSX elements.

### Example

```html
<Table>
  <thead>
    <tr>
      <th>Type</th>
      <th>Example</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Bold</td>
      <td>**Bold text**</td>
    </tr>
    <tr>
      <td>Italic</td>
      <td>*Italic text*</td>
    </tr>
  </tbody>
</Table>
```

This gets converted to a markdown `table` node where the cell containing `**Bold text**` is parsed into a `strong` element with a text node containing "Bold text".

## HTMLBlocks

The `mdxishHtmlBlocks` transformer converts `<HTMLBlock>{`...`}</HTMLBlock>` syntax to `html-block` MDAST nodes. The HTML string is stored in `data.hProperties.html` and passed to the React `HTMLBlock` component via the `html` prop during HAST→React conversion, ensuring compatibility with both the `mdxish` and `compile`+`run` pipelines.

To prevent the markdown parser from incorrectly consuming `<script>`, `<style>` tags inside HTMLBlocks, the content is base64-encoded during preprocessing and then decoded by the transformer.

The transformer handles nested template literals with code fences (e.g., `<HTMLBlock>{`<pre>\`\`\`javascript\nconst x = 1;\n\`\`\`</pre>`}</HTMLBlock>`), preserving newlines and correctly reconstructing triple backticks that may be consumed by the markdown parser. The `formatHTML` utility processes the content to unescape backticks, convert `\n` sequences to actual newlines, and fix cases where the parser consumed backticks from code fences.

## Magic Blocks (Legacy)

The `extractMagicBlocks` + `magicBlockRestorer` pipeline handles legacy ReadMe magic block syntax:

```markdown
[block:image]
{"images":[{"image":["https://example.com/img.png","caption",{"width":"300"}]}]}
[/block]
```

### Flow

1. **Pre-processing (`extractMagicBlocks`)**: Extracts `[block:TYPE]JSON[/block]` patterns and replaces them with placeholder tokens (e.g., `` `__MAGIC_BLOCK_0__` ``). The backticks prevent remarkParse from interpreting special characters in the token.

2. **Restoration (`magicBlockRestorer`)**: After remarkParse, visits `inlineCode` nodes, matches placeholder tokens, and parses the original magic block JSON into MDAST nodes (images, code blocks, callouts, etc.).

This two-phase approach ensures magic blocks don't interfere with markdown parsing while preserving their content for later conversion.
