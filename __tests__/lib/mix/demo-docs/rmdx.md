# RMDX Engine (Refactored MDX)

A comprehensive demo of ReadMe's current MDX Markdown syntax. Test against this doc to validate that legacy RDMD content is rendering properly.

### Reusable Content

Project custom components should be provided to the engine at render time and be usable in the doc:

<MyDemoComponent message="Hello from MDX!">Hello world!</MyDemoComponent>

Reusable content should work the same way:

<ContentBlock />

### Code Blocks

RDMD renders all standard markdown codeblocks. Additionally, when using fenced codeblocks, you can provide an optional title for your block after the syntax lang tag:

```php Sample Code
<? echo "This should render a single codeblock with a title!"; ?>
```

RDMD can display multiple code samples in a tabbed interface. To create tabs, write successive fenced code blocks **without** inserting an empty line between blocks. For example:

```js Tab One
console.log('Code Tab A');
```
```python Tab Two
print('Code Tab B')
```

The engine should render the above code blocks as a set of tabs.

### Callouts

A callout is a special blockquote that begins with either the ℹ️, ✅, ⚠️, or ❗️ emoji. This initial emoji will set the callout’s theme, and the first line becomes the title. For instance:

> ✅ Callout Title
>
> This should render a success callout.

This creates a success callout. Some edge cases are also covered, such as title-only callouts:

> ℹ️ Callouts don't need to have body text.

Nor do they require a title, or a double line break between title and body:

> ⚠️ 
> This callout has a title but no body text.

Finally, if an emoji that isn’t mapped to a theme is used, the callout will fall back to a default style. Callouts can also be written using our custom `<Callout>` component, which accepts a separate `icon` and `theme` prop for even more flexibility. This should render similarly to the above examples:

<Callout icon="🥇" theme="default">
### Callout Component

A default callout using the MDX component.
</Callout>

To prevent a regular blockquote starting with one of the theme emojis from rendering as a callout, you can simply bold the leading emoji in the quote:

> **❗️** This should render a regular blockquote, not an error callout.

### Embeds

RDMD supports rich embeds. You can embed a URL with a special title `@embed` in a normal Markdown link. So for example, this `[Embed Title](https://youtu.be/8bh238ekw3 "@embed")` syntax should render a "rich" preview:

[Embed Title](https://youtu.be/8bh238ekw3 "@embed")

For more control, use the `<Embed>` JSX component and pass properties such as `url`, `title`, `favicon` and `image`.

<Embed
  html={false}
  url="https://github.com/readmeio/api-explorer/pull/671"
  title="RDMD CSS theming and style adjustments. by rafegoldberg · Pull Request #671 · readmeio/api-explorer"
  favicon="https://github.com/favicon.ico"
  image="https://avatars2.githubusercontent.com/u/6878153?s=400&v=4"
/>

### Dynamic Data

RDMD can substitute variables and glossary terms at render time:

* **User variables:** if JWT‑based user variables are configured, you can reference them using curly braces. For example, “`Hi, my name is **{user.name}**!`” expands to the logged‑in user’s name:
  
  > Hi, my name is **{user.name}**!
  
* **Glossary terms:** similarly, if you have defined any glossary terms, you can use the `<Glossary>myterm</Glossary>` tag to show an interactive definition tooltip:

  > The term <Glossary>exogenous</Glossary> should show a tooltip on hover.

* **Emoji shortcodes:** GitHub‑style emoji short codes like `:sparkles:` or `:owlbert-reading:` are expanded to their corresponding emoji or custom image.

### Top-Level JSX Syntax

- top-level logic can be written as JSX **`{3 * 7 + 11}`** expressions and should evaluate inline (to {3 * 7 + 11} in this case.)
- global JS methods are supported, such as **`{uppercase('hello world')}`** (which should evaluate to {uppercase('hello world')}.)
- JSX comments like **`{/* JSX-style comments */}`** should work (while HTML comments like `<!-- HTML-style comments -->` will throw an error.)
- JSX special attributes (like `className`, or setting the `style` as a CSS object) are required
- loose HTML is not supported (i.e. unclosed `<hr>` tags will throw an error)

### Additional Features

- automatic table of contents (TOC) generation per doc section
- Mermaid syntax support for rendering diagrams
- heading semantics + syntax variants:
  * auto‑incremented anchor IDs applied to headings for jump link support
  * supports compact style, so you can omit the space after the hash, i.e. `###Valid Header`
  * respects ATX style headings, so you can wrap headings in hashes, e.g. `## Valid Header ##`
