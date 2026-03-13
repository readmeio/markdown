# MDXish Processor Overview

## `mdxishAstProcessor()`

### Preprocessing Step

> **See**: @lib/mdxish.ts#92-103

`preprocessContent` is a string-level preprocessor that runs before the markdown is handed to remarkParse. It exists because several syntactic patterns in ReadMe's flavor of markdown would confuse or break the standard CommonMark/MDX parser if fed to it directly. By patching the raw string first, these issues are sidestepped.

It applies four transforms in sequence:

1. **`normalizeTableSeparator()`**

   Fixes malformed GFM table separator rows — e.g. misplaced alignment colons like `|: ---` → `| :---`. Without this, remarkGfm would fail to recognize the table.
1. **`terminateHtmlFlowBlocks()`**

   Inserts blank lines after standalone HTML elements (like `<div>...</div>`) when the next line is regular markdown. CommonMark's HTML flow rules only terminate on blank lines, so without this, the parser would swallow subsequent markdown content into the HTML block token.
1. **`preprocessJSXExpressions()`** (skipped in safeMode)

   Handles JSX attribute expressions (`href={someVar}`) and unbalanced braces before the MDX expression tokenizer sees them. It evaluates attribute expressions against jsxContext, converts style objects to CSS strings, and escapes stray braces that would cause MDX parse errors.
1. **`processSnakeCaseComponent()`**

   Remark's parser rejects tag names containing underscores (e.g. `<my_component>`). This step replaces known snake_case component names with safe placeholder names (`<MDXishSnakeCase0>`) and returns a mapping so they can be restored later by the `restoreSnakeCaseComponentNames` transformer in the run phase.

##### Where it sits in the flow

```
                    preprocessContent (string → string)
                              │
                              ▼
┌─────────────────────────────────────────────────────┐
│  normalizeTableSeparator   — fix table syntax       │
│  terminateHtmlFlowBlocks   — fix HTML flow          │
│  preprocessJSXExpressions  — eval/escape JSX        │  before
│  processSnakeCaseComponent — placeholder swap       │  parsing
└─────────────────────────────┬───────────────────────┘
                              │
                              ▼
                      remarkParse (tokenize)
                              │
                              ▼
                    MDAST transformers...
                         ...
                    restoreSnakeCaseComponentNames  ◄── undo (4)
```

### Processor Pipeline

> **See**: @lib/mdxish.ts#105-178

The core Xish engine which parses Markdown and converts it to an MDAST object. This is the base processor used for both the editor and rendering flows.

```
| ................ process (parse only) ...................... |
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
  │  (micromark)          │  (remark plugins)                │
  │                       │                                  │
  │  remarkParse          │  remarkFrontmatter               │
  │    + extensions:      │  normalizeEmphasisAST            │
  │    · magicBlock       │  magicBlockTransformer           │
  │    · legacyVariable   │  imageTransformer                │
  │    · looseHtmlEntity  │  defaultTransformers             │
  │    · mdxExprTextOnly  │    (callouts, codeTabs,          │
  │                       │     gemoji, embeds)              │
  │  + fromMarkdown:      │  mdxishComponentBlocks           │
  │    · magicBlock       │  restoreSnakeCaseComponentNames  │
  │    · legacyVariable   │  mdxishTables                    │
  │    · emptyTaskList…   │  mdxishHtmlBlocks                │
  │    · looseHtmlEntity  │  mdxishJsxToMdast?               │
  │    · mdxExpression…   │  variablesTextTransformer        │
  │                       │  tailwindTransformer?            │
  │                       │  remarkGfm                       │
  │                       │                                  │
  └───────────────────────┴──────────────────────────────────┘
```

## `mdxish()`

### Preprocessing Step

> **See**: @lib/mdxish.ts#209-212

These three lines are a protect-strip-restore pattern that removes JSX comments (`{/* ... */}`) from the markdown before anything else processes it. Here's the step-by-step:

1. **`protectCodeBlocks(mdContent)`**

   Replaces fenced code blocks and inline code with placeholder tokens (`___CODE_BLOCK_0___`, `___INLINE_CODE_0___`), stashing the originals in arrays. This prevents the next step from stripping things that look like JSX comments but are actually inside code.
2. **`removeJSXComments(protectedContent)`**

   Strips all JSX comment expressions from the (now code-protected) string via a single regex. With code blocks safely out of the way, this only hits actual JSX comments in prose/component markup.
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
│  protectCodeBlocks           │  ◄── lines 209-212
│  removeJSXComments           │      (in mdxish())
│  restoreCodeBlocks           │
└──────────────┬───────────────┘
               │ contentWithoutComments
               ▼
┌──────────────────────────────┐
│  preprocessContent           │  ◄── inside mdxishAstProcessor()
│    normalizeTableSeparator   │
│    terminateHtmlFlowBlocks   │
│    preprocessJSXExpressions  │
│    processSnakeCaseComponent │
└──────────────┬───────────────┘
               │ parserReadyContent
               ▼
         remarkParse → transformers → ...
```

### Processor Pipeline

> **See**: @lib/mdxish.ts#214-239

```
| ................ process (parse + run only) ................. |
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
               |              |
  ┌────────────┘          ┌───┴───────────────────────────────────────────┐
  │                       │                                               │
  │  PARSER               │  MDAST TRANSFORMERS          HAST XFORMERS    │
  │  (micromark)          │  (remark plugins)            (rehype)         │
  │                       │                                               │
  │  remarkParse          │  remarkFrontmatter           preserveBool…    │
  │    + extensions:      │  normalizeEmphasisAST         rehypeRaw       │
  │    · magicBlock       │  magicBlockTransformer        restoreBool…    │
  │    · legacyVariable   │  imageTransformer             rehypeFlatten…  │
  │    · looseHtmlEntity  │  defaultTransformers          mdxishMermaid…  │
  │    · mdxExprTextOnly  │    (callouts, codeTabs,       generateSlug…   │
  │                       │     gemoji, embeds)           rehypeMdxish…   │
  │  + fromMarkdown:      │  mdxishComponentBlocks                        │
  │    · magicBlock       │  restoreSnakeCase…        ▲                   │
  │    · legacyVariable   │  mdxishTables             │                   │
  │    · emptyTaskList…   │  mdxishHtmlBlocks         │                   │
  │    · looseHtmlEntity  │  mdxishJsxToMdast?        │  bridge:          │
  │    · mdxExpression…   │  variablesTextTransformer │  remarkRehype     │
  │                       │  tailwindTransformer?     │  (MDAST → HAST)   │
  │                       │  remarkGfm                │                   │
  │                       │  evaluateExpressions?     │                   │
  │                       │  remarkBreaks             │                   │
  │                       │  variablesCodeResolver ───┘                   │
  │                       │                                               │
  └───────────────────────┴───────────────────────────────────────────────┘
```
