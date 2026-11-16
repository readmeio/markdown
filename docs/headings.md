---
title: Headings
category:
  uri: uri-that-does-not-map-to-5fdf7610134322007389a6ed
privacy:
  view: public
---

## Examples

> ### Heading Block 3
>
> #### Heading Block 4
>
> ##### Heading Block 5
>
> ###### Heading Block 6

## Edge Cases

### Heading Styles

####Compact Notation

Headers are denoted using a space-separated `#` prefix. While the space is technically required in most standard Markdown implementations, some processors allow for a compact notation as well. ReadMe supports this style, so writing this

```
###A Valid Heading

Lorem ipsum dolor etc.
```

> 🛑
> Compact headings must be followed by two line breaks before the following block.

#### ATX-Style Notation ####

If you prefer, you can "wrap" headers with hashes rather than simply prefixing them:

```
## ATX Headings are Valid ##
```

#### Underline Notation

For top-level headings, the underline notation is valid:

```
Heading One
===========

Heading Two
---
```

### Incremented Anchors

Occasionally, a single doc might contain multiple headings with the same text, which can cause the generated anchor links to conflict. ReadMe's new markdown processor normalizes heading anchors by auto-incrementing similar heading's IDs. Try it out by clicking on this section header _or_ the following sub-section title:

#### Incremented Heading Anchors

#### Incremented Heading Anchors

### Custom Anchors

End a heading with `{#your-id}` to set its anchor yourself. The anchor then stays the same when the heading's text changes, for example on a translated page:

```
## Prérequis {#prerequisites}
```

This heading links as `#prerequisites`, and `{#prerequisites}` is not shown. An anchor can use letters, numbers, `-`, `_`, `.` and `:`, and needs a space before it. To show a literal `{#…}` at the end of a heading, escape the brace: `\{#each}`. Custom anchors work on `#` headings in the MDXish engine only, not on underlined headings or on legacy callout titles.
