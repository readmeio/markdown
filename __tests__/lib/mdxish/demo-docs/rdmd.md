## RDMD Engine (Legacy Markdown)

A comprehensive demo of ReadMe's legacy RDMD flavored Markdown syntax. Test against this doc to validate that legacy RDMD content is rendering properly.

### Reusable Content

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

Finally, if an emoji that isn’t mapped to a theme is used, the callout will fall back to a default style. To prevent a regular blockquote starting with one of the theme emojis from rendering as a callout, you can simply bold the leading emoji in the quote:

> **❗️** This should render a regular blockquote, not a callout.

### Embeds

RDMD supports rich embeds. You can embed a URL with a special title `@embed` in a normal Markdown link. So for example, this `[Embed Title](https://youtu.be/8bh238ekw3 "@embed")` syntax should render a "rich" preview:

[Embed Title](https://youtu.be/8bh238ekw3 "@embed")

For more control, use the `<Embed>` JSX component and pass properties such as `url`, `title`, `favicon` and `image`.


### Dynamic Data

RDMD can substitute variables and glossary terms at render time:

* **User variables:** if JWT‑based user variables are configured, you can reference them using curly braces. For example, “`Hi, my name is **<<name>>**!`” expands to the logged‑in user’s name:
  
  > Hi, my name is **<<name>>**!
  
* **Glossary terms:** similarly, if you have defined any glossary terms, you can use the `<<glossary:myterm>>` to show an interactive definition tooltip.

  > The term <<glossary:exogenous>> should show a tooltip on hover.
  
* **Emoji shortcodes:** GitHub‑style emoji short codes like `:sparkles:` or `:owlbert-reading:` are expanded to their corresponding emoji or custom image.

### Additional Features

- automatic table of contents (TOC) generation per doc section
- Mermaid syntax support for rendering diagrams
- heading semantics + syntax variants:
  * auto‑incremented anchor IDs applied to headings for jump link support
  * supports compact style, so you can omit the space after the hash, i.e. `###Valid Header`
  * respects ATX style headings, so you can wrap headings in hashes, e.g. `## Valid Header ##`
