---
title: "Getting Started"
category: 5fdf7610134322007389a6ec
excerpt: "ReadMe's Markdown engine, with notes of GitHub, modern styles, and a hint of magic."
hidden: false
metadata: 
  title: "ReadMe-Flavored Markdown"
  description: "ReadMe's Markdown engine, with notes of GitHub, modern styles, and a hint of magic."
  image: 
    0: "https://files.readme.io/aafdc0b-share-image"
    1: "share-image"
    2: 600
    3: 315
    4: "#2caaf8"
---
[<img src=https://github.com/readmeio/markdown/workflows/CI/badge.svg align=right style="margin-top: 3px; margin-bottom: 3px;" />](https://www.npmjs.com/package/@readme/markdown) A remark-based Markdown engine for parsing and rendering ReadMe docs. (In fact, you're looking at it right now, since we've used it to render every doc in this project!)

```bash
npm install --save @readme/markdown
```

> 🧙‍ **Backwards Compatible**
>
> Our old engine was based on a format we call "magic blocks". This was our custom, JSON-based syntax for writing rich components alongside plain-text Markdown. To provide seamless backwards-compatibility, the engine ships with a built-in parser for the older format so we can transpile it directly to our new ReadMe-flavored syntax.

## Usage

By default, the Markdown library exports a function which takes a string of [ReadMe-flavored markdown](#readme-flavored-syntax) and returns a tree of React components:

```javascript Component
import React from 'react';
import rdmd from '@readme/markdown';

export default ({ body }) => (
  <div className="markdown-body">
    {rdmd(body)}
  </div>
);
```

## Exports

### Transformers

In addition to the default React processor, the package exports a few other methods for parsing and rendering ReadMe-flavored markdown:

```javascript
import * as rdmd from '@readme/markdown';
```

This gives you various methods and utilities:

| Export        | Description                                    | Arguments        |
|:------------- |:---------------------------------------------- | ----------------:|
| *`react`*     |_default;_ returns a VDOM React tree            | `text`, `options`|
| *`html`*      | transform markdown in to HTML                  | `text`, `options`|
| *`ast`*       | transform markdown to an mdast object          | `text`, `options`|
| *`md`*        | transform mdast in to ReadMe-flavored markdown | `ast`, `options` |

### Utilities

The `utils` export gives you access to various tools and configuration settings:

- **`options`**
  _a hash of default settings accepted by the rdmd engine._
  - `markdownOptions`—configuration object passed to `remark`
  - `correctnewlines`—flag to toggle newline transformation.
  - `normalize`—auto-normalize magic blocks before processing.
  - `disableTokenizers`—disable internal `block` or `inline` tokenizers.
- **`<GlossaryContext/>`** and **`<VariablesContext/>`**
  React provider and consumer wrappers for [user data injection](doc:features#section-data-injection).
[block:html]
{
  "html": "<style>\n  .markdown-body .callout.callout_default[theme=🧙] {\n    --background: #fffae7;\n    --border: #e6b8086e;\n    --title: #e0b400;\n  }\n</style>"
}
[/block]
