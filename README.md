<p align="center">
  <a href="https://npm.im/@readme/markdown">
    <img src="https://owlbertsio-resized.s3.amazonaws.com/Reading.psd.full.png" width="150" alt="rmdx" />
  </a>
</p>

<p align="center">
  ReadMe's MDX rendering engine and custom component collection.<br />
  <sub>
    Use ReadMe? <a href="https://docs.readme.com/rdmd/page/mdx-engine">Learn more about our upcoming move to MDX!</a>
  </sub>
</p>

<p align="center">
  <a href="https://npm.im/@readme/markdown"><img src="https://img.shields.io/npm/v/@readme/markdown?style=for-the-badge" alt="NPM Version" /></a>
  <a href="https://npm.im/@readme/markdown"><img src="https://img.shields.io/npm/l/@readme/markdown?style=for-the-badge" alt="MIT License" /></a>
  <a href="https://github.com/readmeio/markdown"><img src="https://img.shields.io/github/actions/workflow/status/readmeio/markdown/ci.yml?branch=main&style=for-the-badge" alt="Build status" /></a>
</p>

<p align="center">
  <a href="https://readme.com"><img src="https://raw.githubusercontent.com/readmeio/.github/main/oss-badge.svg" /></a>
</p>

## Usage

To use the engine, install it from NPM:

```
npm install --save @readme/markdown
```

Then [`compile`](#compile) and [`run`](#run) your MDX:

```jsx
import RMDX from '@readme/markdown';

export default ({ body }) => <div className="markdown-body">{RMDX.run(RMDX.compile(body))}</div>;
```

## API

### `compile`

Compiles MDX to JS. Essentially a wrapper around [`mdx.compile`](https://mdxjs.com/packages/mdx/#compilefile-options). Used before calling [`run`](#run); it has been left as a seperate method for potential caching opportunities.

#### Parameters

- **`string`** (`string`)—an MDX document
- **`opts`** ([`CompileOpts`](#compileopts), optional)—a configuration object

#### Returns

A string of compiled Javascript module code.

### `run`

> [!CAUTION]
> This is essentially a wrapper around [`mdx.run`](https://mdxjs.com/packages/mdx/#runcode-options) and **it will `eval` the compiled MDX**. Make sure you only call `run` on safe syntax from a trusted author!

#### Parameters

- **`string`** (`string`)—a compiled mdx document
- **`opts`** (`RunOpts`, optional)—configuration

#### Returns

An [`RMDXModule`](#rmdxmodule) of renderable components.

### `mdx`

Compiles an AST to a string of MDX syntax.

#### Parameters

- **`tree`** (`object`)—an abstract syntax tree
- **`opts`** ([`Options`](https://github.com/remarkjs/remark/tree/main/packages/remark-stringify#options '`remark-stringify` Options type'))—`remark-stringify` configuration.

#### Returns

An MDX string.

### Other Methods

- **`mdast`**: parse MDX syntax to MDAST.
- **`hast`**: parse MDX syntax to HAST.
- **`plain`**: parse MDX to a plaintext string with all Markdown syntax removed. (This _does not_ `eval` the doc.)
- **`tags`**: get a list of tag names from the doc. (This _does not_ `eval` the doc.)
- **`utils`**: additional defaults, helper methods, components, and so on.

## Types

### `CompileOpts`

Extends [`CompileOptions`](https://mdxjs.com/packages/mdx/#compileoptions)

##### Additional Properties

- **`lazyImages`** (`boolean`, optional)—load images lazily
- **`safeMode`** (`boolean`, optional)—extract script tags from `HTMLBlock`s
- **`components`** (`Record<string, string>`, optional)—an object of tag names to mdx.
- **`copyButtons`** (`Boolean`, optional) — add a copy button to code blocks

### `RunOpts`

Extends [`RunOptions`](https://mdxjs.com/packages/mdx/#runoptions)

##### Additional Properties

- **`components`** (`Record<string, MDXModule>`, optional)—a set of custom MDX components
- **`imports`** (`Record<string, unknown>`, optional)—an set of modules to import globally
- **`terms`** (`GlossaryTerm[]`, optional)
- **`variables`** (`Variables`, optional)—an object containing [user variables](https://github.com/readmeio/variable)

### `RMDXModule`

##### Properties

- **`default`** (`() => MDXContent`)—the MDX douments default export
- **`toc`** (`HastHeading[]`)—a list of headings in the document
- **`Toc`** (`() => MDCContent`)—a table of contents component

## Local development and testing

To make changes to the RDMD engine locally, run the local development server. Clone the repo, `cd` in to it, `npm install`, and `npm run start`!

If you make changes to the docs or how the markdown is rendered, you may need to update the visual regression snapshots by running `make updateSnapshot`. Running these browser tests requires `docker`. Follow the docker [install instructions for mac](https://docs.docker.com/docker-for-mac/install/). You may want to increase the [memory usage](https://docs.docker.com/docker-for-mac/#resources). If you have not already, you'll need to create an account for `docker hub` and [sign-in locally](https://docs.docker.com/docker-for-mac/#docker-hub).

### Linking Changes to Storybook

In `markdown`, change package.json name to `@readme/mdx`. Then run:

```
npm link && npm watch
```

In `readme` run:

```
npm link PATH_TO_LOCAL_MARKDOWN_REPO
```

Will not work with the full app. Use Storybook.
