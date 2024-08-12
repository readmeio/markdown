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

Compiles mdx to js. A wrapper around [`mdx.compile`](https://mdxjs.com/packages/mdx/#compilefile-options)

You usually only need this when calling `run` as well. It's been left as a seperate step as a potential caching opportunity.

###### Parameters

- `string` (`string`) -- An mdx document
- `opts` ([`CompileOpts`](#compileopts), optional) -- configuration

###### Returns

compiled code (`string`)

#### `run`

Run compiled code. A wrapper around [`mdx.run`](https://mdxjs.com/packages/mdx/#runcode-options)

> [!CAUTION]
> This `eval`'s JavaScript.

###### Parameters

- `string` (`string`) -- A compiled mdx document
- `opts` (`RunOpts`, optional) -- configuration

###### Returns

A module ([`RMDXModule`](#rmdxmodule)) of renderable components

#### `mdx`

Compiles an ast to mdx.

#### `mdast`

Parses mdx to an mdast.

#### `hast`

Parses mdx to an hast.

#### `plain`

Parses mdx to a plain string. It **does** not execute the doc.

#### `tags`

Returns a list of tag names from the doc. It **does** not execute the doc.

#### `utils`

Additional defaults, helpers, components, etc.

### `CompileOpts`

Extends [`CompileOptions`](https://mdxjs.com/packages/mdx/#compileoptions)

###### Additional Properties

- `lazyImages` (`boolean`, optional) -- Load images lazily.
- `safeMode` (`boolean`, optional) -- Extract script tags from `HTMLBlock`s
- `components` (`Record<string, string>`, optional) -- An object of tag names to mdx.
- `copyButtons` (`Boolean`, optional) — Automatically insert a button to copy a block of text to the clipboard. Currently used on `<code>` elements.

### `RunOpts`

Extends [`RunOptions`](https://mdxjs.com/packages/mdx/#runoptions)

###### Additional Properties

- `components` (`Record<string, MDXModule>`, optional) -- An object of tag names to executed components.
- `imports` (`Record<string, unknown>`, optional) -- An object of modules to import.
- `terms` (`GlossaryTerm[]`, optional)
- `variables` (`Variables`, optional) -- An object containing [user variables}(https://github.com/readmeio/variable).

### `RMDXModule`

###### Properties

- `default` (`() => MDXContent`) -- The mdx douments default export
- `toc` (`HastHeading[]`) -- A list of headings in the document
- `Toc` (`() => MDCContent`) -- A table of contents component

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
