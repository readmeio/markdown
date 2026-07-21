# MDXish Processor Overview

## `mdxishAstProcessor()`

### Preprocessing Step

> **See**: `preprocessContent` — @lib/mdxish.ts#120

`preprocessContent` is a string-level preprocessor that runs before the markdown is handed to remarkParse. It exists because several syntactic patterns in ReadMe's flavor of markdown would confuse or break the standard CommonMark/MDX parser if fed to it directly. By patching the raw string first, these issues are sidestepped.

It applies seven transforms in sequence (the function carries a matching docstring at @lib/mdxish.ts#107):

1. **`normalizeClosingTagWhitespace()`**

   Canonicalizes closing tags that contain stray whitespace (e.g. `</ td >` → `</td>`). Runs first so that `jsxTable` later sees a literal `</table>` and so the HTML-line classification in `terminateHtmlFlowBlocks` is accurate.
1. **`normalizeTableSeparator()`**

   Fixes malformed GFM table separator rows — e.g. misplaced alignment colons like `|: ---` → `| :---`. Without this, remarkGfm would fail to recognize the table.
1. **`collapseForeignContentBlankLines()`**

   Collapses blank lines inside `<svg>`/`<math>` islands. A blank line inside foreign content would otherwise fragment it — the children spill out as an indented code block once a wrapper re-parses its deindented body (#1545).
1. **`terminateHtmlFlowBlocks()`**

   Inserts blank lines after standalone HTML elements (like `<div>...</div>`) when the next line is regular markdown. CommonMark's HTML flow rules only terminate on blank lines, so without this, the parser would swallow subsequent markdown content into the HTML block token.
1. **`closeSelfClosingHtmlTags()`**

   Rewrites invalid "self-closing" HTML tags into explicit open/close pairs (e.g. `<i />` → `<i></i>`). HTML (unlike JSX) has no self-closing syntax for non-void elements, so leaving these would confuse the parser.
1. **`normalizeCompactHeadings()`**

   Normalizes compact ATX headings that omit the space after the hashes (e.g. `#Heading` → `# Heading`) so they are recognized as headings rather than paragraph text.
1. **`processSnakeCaseComponent()`**

   Remark's parser rejects tag names containing underscores (e.g. `<my_component>`). This step replaces known snake_case component names with safe placeholder names (`<MDXishSnakeCase0>`) and returns a mapping so they can be restored later by the `restoreSnakeCaseComponentNames` transformer in the run phase.

> **Note:** Earlier revisions of this pipeline also ran a `preprocessJSXExpressions()` string transform to escape stray/unbalanced braces. That step was removed (#1429, #1531). MDX expressions are now handled at the parser level by the lenient expression tokenizer (`mdxExprTextOnly` = `mdxExpressionLenient()`), and attribute expressions flow through as `mdxJsxAttributeValueExpression` nodes that are evaluated later.

##### Where it sits in the flow

```
                    preprocessContent (string → string)
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│  normalizeClosingTagWhitespace — fix stray-space closers │
│  normalizeTableSeparator       — fix table syntax        │
│  collapseForeignContentBlankLines — keep svg/math whole  │  before
│  terminateHtmlFlowBlocks       — fix HTML flow           │  parsing
│  closeSelfClosingHtmlTags      — <i /> → <i></i>         │
│  normalizeCompactHeadings      — #Heading → # Heading    │
│  processSnakeCaseComponent     — placeholder swap        │
└─────────────────────────────┬─────────────────────────────┘
                              │
                              ▼
                      remarkParse (tokenize)
                              │
                              ▼
                    MDAST transformers...
                         ...
                    restoreSnakeCaseComponentNames  ◄── undo (7)
```

### Processor Pipeline

> **See**: `mdxishAstProcessor` — @lib/mdxish.ts#141 (parser setup #166, `.use` chain #208)

The core Xish engine which parses Markdown and converts it to an MDAST object. This is the base processor used for both the editor and rendering flows. `mdxishAstProcessor` returns the *configured but un-run* processor (plus `parserReadyContent`); callers run it, or `mdxish()` extends it further (see below).

`safeMode` skips all evaluation of user-authored code (MDX expressions, `export`s, attribute expressions) for security — in safe mode those stay as literal text.

Several parser extensions and transformers are conditional:
- `!safeMode` adds the MDX expression tokenizer, the ESM (`export`) tokenizer, and the JSX-comment tokenizer.
- `newEditorTypes` adds `mdxishInlineMdxComponents` and `mdxishJsxToMdast`.
- `useTailwind` adds `tailwindTransformer`.

```
| ................ process (parse + run to MDAST) ............ |
| .. parse ........... | .............. run .................. |

                                                      NO COMPILER
          +--------+                     +----------+  (MDAST is
Input ->- | Parser | ->- Syntax Tree ->- |    N/A   |   returned
          +--------+          |          +----------+   directly)
               |              |
               |              X
               |              |
               |       +--------------+
               |       | Transformers |
               |       +--------------+
               |              |
  ┌────────────┘          ┌───┴──────────────────────────────┐
  │                       │                                  │
  │  PARSER               │  MDAST TRANSFORMERS              │
  │  (micromark)          │  (remark plugins, in .use order) │
  │                       │                                  │
  │  remarkParse          │  remarkFrontmatter               │
  │   micromarkExts:      │  normalizeEmphasisAST            │
  │    · jsxTable         │  mdxishSelfClosingBlocks         │
  │    · magicBlock       │  mdxishMdxComponentBlocks        │
  │    · mdxComponent     │  mdxishInlineMdxHtmlBlocks       │
  │    · gemoji           │  restoreSnakeCaseComponentNames  │
  │    · legacyVariable   │  mdxishTables                    │
  │    · looseHtmlEntity  │  mdxishHtmlBlocks                │
  │    · htmlBlockComp.   │  magicBlockTransformer           │
  │    · mdxExprTextOnly? │  imageTransformer                │
  │    · mdxjsEsm?        │  defaultTransformers             │
  │    · jsxComment?      │    (callouts, codeTabs, embeds)  │
  │                       │  mdxishInlineMdxComponents?      │
  │   fromMarkdownExts:   │  mdxishJsxToMdast?               │
  │    · jsxTable         │  variablesTextTransformer        │
  │    · magicBlock       │  tailwindTransformer?            │
  │    · mdxComponent     │  remarkGfm                       │
  │    · gemoji           │                                  │
  │    · legacyVariable   │                                  │
  │    · emptyTaskList…   │                                  │
  │    · looseHtmlEntity  │                                  │
  │    · htmlBlockComp.   │                                  │
  │    · mdxExpression…?  │                                  │
  │    · mdxjsEsm…?       │                                  │
  │                       │                                  │
  └───────────────────────┴──────────────────────────────────┘
      ? = added only when !safeMode (parser) / when the
          matching opt is set (transformers).
      Insertion isn't append-only: mdxExprTextOnly / mdxExpression
      are spliced in right after gemoji, and jsxComment is prepended
      to the micromark list so it claims `{/* … */}` before magicBlock.
```

## `mdxish()`

### Preprocessing Step

> **See**: @lib/mdxish.ts#291

These three lines are a protect-strip-restore pattern that removes JSX comments (`{/* ... */}`) from the markdown before anything else processes it. Here's the step-by-step:

1. **`protectCodeBlocks(mdContent)`**

   Replaces fenced code blocks and inline code with placeholder tokens (`___CODE_BLOCK_0___`, `___INLINE_CODE_0___`), stashing the originals so they can be restored later. This prevents the next step from stripping things that look like JSX comments but are actually inside code.
2. **`removeJSXComments(protectedContent)`**

   Strips all JSX comment expressions from the (now code-protected) string. With code blocks safely out of the way, this only hits actual JSX comments in prose/component markup.
3. **`restoreCodeBlocks(withoutComments, protectedCode)`**

   Swaps the placeholder tokens back to their original code content, yielding the final `contentWithoutComments` string.

##### Why it's necessary

JSX comments are valid in MDX but have no meaning in the rendered output. If left in, they'd be parsed by the MDX expression tokenizer (the `mdxExprTextOnly` micromark extension) as expression nodes and could appear as literal text or cause parse errors. Stripping them at the string level — before `mdxishAstProcessor` and `preprocessContent` even run — is the simplest way to ensure they're gone.

##### Where it sits in the flow

This runs in `mdxish()` before calling `mdxishAstProcessor`, making it the very first string-level transform — even before `preprocessContent`:

```
mdContent (raw input)
    │
    ▼
┌──────────────────────────────┐
│  protectCodeBlocks           │  ◄── line 291
│  removeJSXComments           │      (in mdxish())
│  restoreCodeBlocks           │
└──────────────┬───────────────┘
               │ contentWithoutComments
               ▼
┌───────────────────────────────────┐
│  preprocessContent                │  ◄── inside mdxishAstProcessor()
│    normalizeClosingTagWhitespace  │
│    normalizeTableSeparator        │
│    collapseForeignContentBlankLines
│    terminateHtmlFlowBlocks        │
│    closeSelfClosingHtmlTags       │
│    normalizeCompactHeadings       │
│    processSnakeCaseComponent      │
└──────────────┬────────────────────┘
               │ parserReadyContent
               ▼
         remarkParse → transformers → ...
```

### Processor Pipeline

> **See**: `mdxish` — @lib/mdxish.ts#282 (appended `.use` chain #297)

`mdxish()` takes the base processor from `mdxishAstProcessor()` and appends the remaining MDAST transformers, the MDAST → HAST bridge (`remarkRehype`), and the HAST (rehype) transformers, then runs it and returns the resulting HAST tree. As with the base processor there is no compiler/stringify stage — a tree is returned directly.

The `!safeMode`-only stages are the expression/export evaluators and the deferred-attribute resolver.

```
| ................ process (parse + run to HAST) ............. |
| .. parse ........... | .............. run ................... |

                                                      NO COMPILER
          +--------+                     +----------+  (HAST obj
Input ->- | Parser | ->- Syntax Tree ->- |    N/A   |   returned
          +--------+          |          +----------+   directly)
               |              X
               |              |
               |       +--------------+
               |       | Transformers |
               |       +--------------+
               |              |
  ┌────────────┘          ┌───┴───────────────────────────────────────────┐
  │                       │                                               │
  │  PARSER               │  MDAST TRANSFORMERS          HAST XFORMERS    │
  │  (as base, above)     │  (remark plugins)            (rehype)         │
  │                       │                                               │
  │  …base pipeline…      │  …base MDAST transformers…   preserveBool…    │
  │                       │  evaluateExports?            rehypeRaw        │
  │                       │  hardBreaks                  restoreBool…     │
  │                       │  evaluateExpressions?        resolveDeferred…?│
  │                       │  evaluateStyleBlockExpr?     normalizeMdxJsx… │
  │                       │  variablesCodeResolver ──┐   rehypeFlatten…   │
  │                       │                          │   mdxishMermaid…   │
  │                       │                          │   generateSlug…    │
  │                       │              bridge:      │   rehypeMdxish…    │
  │                       │              remarkRehype ┘                    │
  │                       │              (MDAST → HAST,                    │
  │                       │               mdxComponentHandlers)           │
  │                       │                                               │
  └───────────────────────┴───────────────────────────────────────────────┘
      ? = added only when !safeMode

  rehypeRaw passes through `html-block` and `mdx-jsx` nodes so they bypass
  parse5's string-only HTML round-trip.
```

## `mdxishMdastToMd()`

> **See**: @lib/mdxish.ts#256

The reverse direction: serializes an MDAST back into a markdown string (used by the editor's "view as markdown" / round-trip path). It runs a small `remark`/`remark-stringify` pipeline that re-serializes the ReadMe-flavored nodes back to their authored JSX before stringifying:

- `mdxishCalloutToJsx` / `mdxishTablesToJsx` — turn callout and `table` nodes back into `<Callout>` / `<Table>` JSX.
- `mdxJsxStringify` — registers the `mdast-util-mdx-jsx` toMarkdown extension so JSX nodes serialize.
- `remarkStringify` is configured with `bullet: '-'`, `emphasis: '_'`, and an `unsafe` rule that escapes literal `{`/`}` in phrasing so they don't re-parse as (often unterminated) MDX expressions on the next round trip.

## Custom Tokenizers (micromark extensions)

Most of MDXish's flavored syntax is recognized at **parse time** by custom micromark tokenizers rather than reconstructed from strings afterwards. micromark is the low-level scanner unified/remark runs first: it walks the source character by character and emits *tokens*, which remark then assembles into the MDAST. Teaching it a new token makes a construct a first-class node from the start and safe from being fragmented by other constructs. This is why the pipeline favors tokenizers over string preprocessing.

### How an extension is wired

Each extension is a **pair**, registered through the two arrays in `mdxishAstProcessor` (@lib/mdxish.ts#168):

- a micromark tokenizer in `lib/micromark/*` (listed under `micromarkExtensions`) that emits the raw tokens, and
- a fromMarkdown handler in `lib/mdast-util/*` (listed under `fromMarkdownExtensions`) that turns those tokens into an MDAST node.

A tokenizer registers itself under one or more **constructs**, keyed by the character that triggers it:

- **flow** — block-level constructs that start at the beginning of a line.
- **text** — inline constructs that appear inside a paragraph or other text.

A construct may set `concrete: true` to keep container markers (`>` for blockquotes, `-`/`*` for list items) from interrupting it mid-body. Registration **order matters**: micromark tries the last-registered extension first, so the pipeline splices or prepends constructs to win the race for a shared trigger character — e.g. `jsxComment` is prepended so it claims `{/* … */}` before other `{`-openers, and the MDX expression extension is registered *text-only* (`mdxExpressionLenient()`, no flow construct) so a line-leading `{` can't hijack a block that owns it.

### Example: magic blocks

Magic blocks (@lib/micromark/magic-block/syntax.ts) parse ReadMe's legacy JSON block syntax into first-class nodes that survive any context:

```markdown
[block:image]
{"images":[{"image":["https://example.com/img.png","caption",{"width":"300"}]}]}
[/block]
```

The recognized block types live in `KNOWN_BLOCK_TYPES` (@lib/micromark/magic-block/syntax.ts#34); unknown types are left untokenized. The tokenizer registers the `[` opener under both constructs — a **flow** construct (`tokenizeMagicBlockFlow`) for block-level, multiline blocks at the document root, marked `concrete: true` so blockquote/list markers can't interrupt it mid-body; and a **text** construct (`tokenizeMagicBlockText`) for blocks nested in list items and paragraphs. `lib/mdast-util/magic-block` then converts the tokens to MDAST, and `magicBlockTransformer` expands them into the final nodes (images, code blocks, callouts, embeds, etc.).
