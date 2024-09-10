# @readme/markdown

<img align="right" width="26%" src="https://owlbertsio-resized.s3.amazonaws.com/Reading.psd.full.png">

ReadMe's MDX rendering engine and custom component collection. <img align=center src=https://github.com/readmeio/markdown/workflows/CI/badge.svg alt="RDMD CI Status">

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

Compiles MDX to JS. Essentially a wrapper around [`mdx.compile`](https://mdxjs.com/packages/mdx/#compilefile-options). You usually only need this when calling `run` as well. It's been left as a seperate step as a potential caching opportunity.

###### Parameters

- `string` (`string`) -- an MDX document
- `opts` ([`CompileOpts`](#compileopts), optional) -- a configuration object

###### Returns

compiled code (`string`)

#### `run`

> [!CAUTION]
> **This will `eval` the compiled MDX**! Essentially a wrapper around [`mdx.run`](https://mdxjs.com/packages/mdx/#runcode-options).

###### Parameters

- `string` (`string`) -- A compiled mdx document
- `opts` (`RunOpts`, optional) -- configuration

###### Returns

A module ([`RMDXModule`](#rmdxmodule)) of renderable components

#### `mdx`

Compiles an ast to mdx.

###### Parameters

Extends [`remark-stringify` options](https://github.com/remarkjs/remark/tree/main/packages/remark-stringify#options).

###### Returns

An mdx string.

#### `mdast`

Parses mdx to an mdast.

#### `hast`

Parses mdx to an hast.

#### `plain`

Parses mdx to a plain string. (This **does** not `eval` the doc.)

#### `tags`

Returns a list of tag names from the doc. (This **does** not `eval` the doc.)

#### `utils`

Additional defaults, helpers, components, etc.

### `CompileOpts`

Extends [`CompileOptions`](https://mdxjs.com/packages/mdx/#compileoptions)

###### Additional Properties

- `lazyImages` (`boolean`, optional) -- load images lazily
- `safeMode` (`boolean`, optional) -- extract script tags from `HTMLBlock`s
- `components` (`Record<string, string>`, optional) -- an object of tag names to mdx.
- `copyButtons` (`Boolean`, optional) — add a copy button to code blocks

### `RunOpts`

Extends [`RunOptions`](https://mdxjs.com/packages/mdx/#runoptions)

###### Additional Properties

- `components` (`Record<string, MDXModule>`, optional) -- a set of custom MDX components
- `imports` (`Record<string, unknown>`, optional) -- an set of modules to import globally
- `terms` (`GlossaryTerm[]`, optional)
- `variables` (`Variables`, optional) -- an object containing [user variables](https://github.com/readmeio/variable)

### `RMDXModule`

###### Properties

- `default` (`() => MDXContent`) -- the MDX douments default export
- `toc` (`HastHeading[]`) -- a list of headings in the document
- `Toc` (`() => MDCContent`) -- a table of contents component

## Flavored Syntax

We've also sprinkled a bit of our own custom components in to help you supercharge your docs. [**Learn more about ReadMe's new MDX engine!**](https://docs.readme.com/rdmd/page/mdx-engine)

## Local Development

To make changes to the RDMD engine locally, run the local development server. Clone the repo, `cd` in to it, `npm install`, and `npm run start`!

### Environment setup

Running the browser tests requires `docker`. Follow the docker [install instructions for mac](https://docs.docker.com/docker-for-mac/install/). You may want to increase the [memory usage](https://docs.docker.com/docker-for-mac/#resources). If you have not already, you'll need to create an account for `docker hub` and [sign-in locally](https://docs.docker.com/docker-for-mac/#docker-hub).

### Running visual regression tests

If you make changes to the docs or how the markdown is rendered, you may need to update the visual regression snapshots. You can run the visual regression tests in a docker container with:

```
make updateSnapshot
```
