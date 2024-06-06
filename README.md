# @readme/markdown

<img align="right" width="26%" src="https://owlbertsio-resized.s3.amazonaws.com/Reading.psd.full.png">

ReadMe's flavored Markdown parser and MDX rendering engine. <img align=center src=https://github.com/readmeio/markdown/workflows/CI/badge.svg alt="RDMD CI Status">

```
npm install --save @readme/markdown
```

## Usage

```jsx
import React from 'react';
import rmdx from '@readme/markdown';

export default ({ body }) => <div className="markdown-body">{run(compile(body))}</div>;
```

### API

#### `compile`

Compiles mdx to js.

A wrapper around [`mdx.compile`](https://mdxjs.com/packages/mdx/#compilefile-options)

#### `run`

Run compiled code.

> [!CAUTION] This `eval`'s JavaScript.

A wrapper around [`mdx.run`](https://mdxjs.com/packages/mdx/#runcode-options)

#### `mdx`

Compiles an ast to mdx.

#### `mdast`

Parses mdx to an mdast.

#### `hast`

Parses mdx to an hast.

#### `plain`

> [!NOTE] unimplemented

#### `utils`

Additional defaults, helpers, components, etc.

### Settings & Options

Each processor method takes an options object which you can use to adjust the output HTML or React tree. These options include:

- **`copyButtons`** — Automatically insert a button to copy a block of text to the clipboard. Currently used on `<code>` elements.
- **`markdownOptions`** — Remark [parser options](https://github.com/remarkjs/remark/tree/main/packages/remark-stringify#processorusestringify-options).
- **`safeMode`** — Render html blocks as `<pre>` elements. We normally allow all manner of html attributes that could potentially execute JavaScript.

## Flavored Syntax

~~Our old editor rendered "Magic Block" components from a custom, JSON-based syntax. To provide seamless backwards-compatibility, our new processor ships with built in support for parsing this old format, and transpiles it straight in to our new, flavored Markdown.~~

We've also sprinkled a bit of our own syntactic sugar on top to let you supercharge your docs. [**Learn more about ReadMe's flavored syntax!**](https://docs.readme.com/rdmd/docs/syntax-extensions)

## Local Development

To make changes to the RDMD engine locally, run the local development server. Clone the repo, `cd` in to it, `npm install`, and `npm run start`!

### Environment setup

Running the browser tests requires `docker`. Follow the docker [install instructions for mac](https://docs.docker.com/docker-for-mac/install/). You may want to increase the [memory usage](https://docs.docker.com/docker-for-mac/#resources). If you have not already, you'll need to create an account for `docker hub` and [sign-in locally](https://docs.docker.com/docker-for-mac/#docker-hub).

### Running visual regression tests

If you make changes to the docs or how the markdown is rendered, you may need to update the visual regression snapshots. You can run the visual regression tests in a docker container with:

```
make updateSnapshot
```

## Credits

- **License**: MIT
- **Authors**: [Dom Harrington](https://github.com/domharrington/), [Rafe Goldberg](https://github.com/rafegoldberg)
