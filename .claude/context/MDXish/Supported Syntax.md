# MDXish Supported Syntax

## Custom Blocks

### Code Tabs

Tabbed interface for multiple code blocks - written as immediately consecutive standard code blocks (i.e. **without** any line breaks between them).

	```js Title One
	console.log('Tab One');
	```
	```js Title Two
	console.log('Tab Two');
	```

### Callouts

Blockquotes that start with an emoji are rendered determine the theme:

	> 👍 Success
	>
	> Your success message here

#### Supported Themes

- **Info**: 📘 or ℹ️ (blue)
- **Success**: 👍 or ✅ (green)
- **Warning**: 🚧 or ⚠️ (orange)
- **Error**: ❗️ or 🛑 (red)
- **Default**: any other emoji (gray)

### Embeds

Simple markdown link with `@embed` title:

	[Embed Title](https://youtu.be/example "@embed")

## Data Replacement Syntaxes

### User Variables

Double angle-bracket notation for JWT login variables:

	Hi, my name is **<<name>>**!

### Glossary Terms

Double angle-brackets with `glossary:` prefix:

	**<<glossary:exogenous>>** and **<<glossary:endogenous>>**

## MDX Syntax

A subset of MDX syntax is supported.

### Custom Components
You can embed React components or reusable Markdown snippets in a document using JSX elements:

    <MyComponent prop="value" />

### Logical Expressions

Simple logic is also supported using the JSX-style curly brace syntax:

	{(4 * 3) / 2} of 1, a half dozen of another.

This expression syntax can also be used as an alternative for user variables:

	Hi, my name is **{user.name}**!

## Standard Markdown Extensions

Full **CommonMark** and **GitHub-flavored Markdown** support, including:

### Emoji Shortcodes

GitHub-style emoji codes:

	:sparkles:

### Tables

GFM-style tables with alignment support:

	| Left |  Center  | Right |
	|:-----|:--------:|------:|
	| L0   | **bold** | $1600 |

### Lists

Standard bulleted (`-` or `*`) and numbered lists (`1.`, `2.`, etc.) are supported, as well as GFM-style checklists:

```md
- [x] finished item
- [ ] unfinished item
```

### Headings

Standard Markdown heading syntaxes (`#` prefixes) are supported, as well as compact and ATX-wrapped variations:

	##Compact Heading without a space

	## ATX-Style Wrapped Heading ##

Underline notation (using `=` or `-` are also supported for first and second level headings, respectively.

## Legacy Magic Blocks

The engine also supports the legacy JSON-based "magic block" syntax for backwards compatibility.

	[block:api-header]
	{
	  "title": "Section Title"
	}
	[/block]

This is a legacy format that should be transpiled to newer ReadMe-flavored syntax. Supported magic blocks include:

| Feature       | Magic Block Name       |
|---------------|------------------------|
| Heading       | `[block:api-header]`   |
| Callout       | `[block:callout]`      |
| Embed         | `[block:embed]`        |
| Custom HTML   | `[block:html]`         |
| Image         | `[block:image]`        |
| Table         | `[block:parameters]`   |

## Additional Features

- **Auto-generated heading anchors** with incremental IDs for duplicate headings
- **Table of Contents generation** from markup
- **Custom `doc:` and `ref:` protocols** for internal documentation links
- **Both JSX and HTML comments** for non-rendered notes and annotations
