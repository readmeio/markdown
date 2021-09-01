<img align="right" width="26%" src="https://owlbert.io/images/owlberts-png/Reading.psd.png">

@readme/markdown
===

ReadMe's flavored Markdown parser and MDX rendering engine. ![CI Status](https://github.com/readmeio/markdown/workflows/CI/badge.svg)

```
npm install --save @readme/markdown
```

## Usage

By default, the updated markdown package exports a function which takes a string of [ReadMe-flavored markdown](https://docs.readme.com/rdmd/docs/syntax-extensions) and returns a tree of React components:

```jsx
import React from 'react';
import rdmd from "@readme/markdown";

export default ({ body }) => (
  <div className="markdown-body">
    {rdmd(body)}
  </div>
);
```

### Export Methods

In addition to the default React processor, the package exports some other methods for transforming ReadMe-flavored markdown:

| Export  | Description                                    | Arguments       |
| -------:|:---------------------------------------------- |:--------------- |
|*`react`*|_(default)_ returns a VDOM tree object          |`text`, `options`|
|*`md`*   | transform mdast in to ReadMe-flavored markdown |`tree`, `options`|
|*`html`* | transform markdown in to HTML                  |`text`, `options`|
|*`mdast`*| transform markdown to an mdast object          |`text`, `options`|
|*`hast`* | transform markdown to HAST object              |`text`, `options`|
|*`plain`*| transform markdown to plain text               |`text`, `options`|
|*`utils`*| contexts, defaults, helpers, etc.              | N/A             |

### Settings & Options

Each processor method takes an options object which you can use to adjust the output HTML or React tree. These options include:

- **`compatibilityMode`** — Enable [compatibility features](https://github.com/readmeio/api-explorer/issues/668) from our old markdown engine.
- **`copyButtons`** — Automatically insert a button to copy a block of text to the clipboard. Currently used on `<code>` elements.
- **`correctnewlines`** — Render new line delimeters as `<br>` tags.
- **`markdownOptions`** — Remark [parser options](https://github.com/remarkjs/remark/tree/main/packages/remark-stringify#processorusestringify-options).

## Flavored Syntax

Our old editor rendered "Magic Block" components from a custom, JSON-based syntax. To provide seamless backwards-compatibility, our new processor ships with built in support for parsing this old format, and transpiles it straight in to our new, flavored Markdown.

We've also sprinkled a bit of our own syntactic sugar on top to let you supercharge your docs. [**Learn more about ReadMe's flavored syntax!**](https://docs.readme.com/rdmd/docs/syntax-extensions)

## Local Development

To make changes to the RDMD engine locally is to run the local development server. Clone the repo, `cd` in to it, `npm install`, and `npm run start`!

## Credits

- **Lisence**: MIT
- **Authors**: [Dom Harrington](https://github.com/domharrington/), [Rafe Goldberg](https://github.com/rafegoldberg)
