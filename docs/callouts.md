---
title: 'Callouts'
category: 5fdf7610134322007389a6ed
hidden: false
metadata:
  image:
    0: 'https://files.readme.io/9134da7-rdmd.readme-stage-pr-2438.readme.ninja_docs_callouts.png'
    1: 'rdmd.readme-stage-pr-2438.readme.ninja_docs_callouts.png'
    2: 530
    3: 173
    4: '#edf3ec'
---

## Syntax

Callouts are very nearly equivalent to standard Markdown block quotes in their syntax, other than some specific requirements on their content: To be considered a “callout”, a block quote must start with an initial emoji. This is used to determine the callout's theme. Here's an example of how you might write a success callout.

```
> 👍 Success
>
> Vitae reprehenderit at aliquid error voluptates eum dignissimos.
```

### Emoji Themes

Default themes are specified using one of the following emojis. (If you don't like the one we've chosen, you can always switch to the alternate!)

| Emoji | Class            | Alternate |
| :---: | :--------------- | --------: |
|  📘   | `.callout_info`  |        ℹ️ |
|  👍   | `.callout_okay`  |        ✅ |
|  🚧   | `.callout_warn`  |        ⚠️ |
|  ❗️   | `.callout_error` |        🛑 |

<hr />
<details>
  <summary><em>Tips & Tricks </em></summary><br />

If you have a block quote that starts with an initial emoji which _should not_ be rendered as a ReadMe callout, just bold the emoji. It's a bit of a hack for sure, but it's easy enough, and hey: it works! So this:

```
> **👋** Lorem ipsum dolor sit amet consectetur adipisicing elit.
```

Renders to a plain ol' block quote:

> **👋** Lorem ipsum dolor sit amet consectetur adipisicing elit.

</details><hr />

## Examples

> 👍 [Success](#edge-cases)
>
> Vitae reprehenderit at aliquid error voluptates eum dignissimos.

> 📘 Info
>
> Lorem ipsum dolor sit amet consectetur adipisicing elit.

> 🚧 Warning
>
> Hic, neque a nisi adipisci non repudiandae ratione id natus.

> ❗️ Error
>
> Sunt eius porro assumenda sequi, explicabo dolorem unde.

If a callout starts with an emoji that's not dedicated to one of the themes (above), the component will fall back to a default block quote-style color scheme. See [here](https://unicode.org/Public/emoji/14.0/emoji-test.txt) for the full list of supported emojis.

> 🥇 Themeless
>
> Lorem ipsum dolor sit amet consectetur adipisicing elit.

## Custom CSS

Callouts come in [various themes](#section--examples-). These can be customized using the following CSS selectors and variables:

```scss CSS Variables
.markdown-body .callout.callout_warn {
  --text: #6a737d; // theme text color default
  --title: inherit; // theme title color (falls back to text color by default)
  --background: #f8f8f9;
  --border: #8b939c;
}
```

```scss Theme Selectors
.markdown-body .callout.callout_default {
} /* gray */
.markdown-body .callout.callout_info {
} /* blue */
.markdown-body .callout.callout_okay {
} /* green */
.markdown-body .callout.callout_warn {
} /* orange */
.markdown-body .callout.callout_error {
} /* red */
```

### Extended Themes

Each callout will also have a `theme` attribute that's set to it's emoji prefix. Combined with a basic attribute selector, we should be able to create entirely new styles per-emoji, in addition to the built in themes above!

```css Custom CSS
.markdown-body .callout[theme='🎅'] {
  --Callout-bg: #c54245;
  --border: #ffffff6b;
  --text: #f5fffa;
}
```

<HTMLBlock>{`

<style>
.markdown-body .callout[theme=\"🎅\"] {
  --background: #c54245 !important;
  --border: #ffffff6b;
  --text: #f5fffa;
}
</style>`}
</HTMLBlock>

```markdown Markdown Syntax
> 🎅 Old Saint Nick
>
> 'Twas the night before Christmas, when all through the house not a creature was stirring, not even a mouse. The stockings were hung by the chimney with care, in hopes that St. Nicholas soon would be there. The children were nestled all snug in their beds, while visions of sugar plums danced in their heads.
```

```html Generated HTML
<!-- condensed for clarity! -->
<blockquote class="callout callout_default" theme="🎅">
  <h3>🎅 Old Saint Nick</h3>
  <p>
    'Twas the night before Christmas, when all through the house not a creature was stirring, not even a mouse. The
    stockings were hung by the chimney with care, in hopes that St. Nicholas soon would be there. The children were
    nestled all snug in their beds, while visions of sugar plums danced in their heads.
  </p>
</blockquote>
```

And voilà...

> 🎅 Old Saint Nick
>
> 'Twas the night before Christmas, when all through the house not a creature was stirring, not even a mouse. The stockings were hung by the chimney with care, in hopes that St. Nicholas soon would be there. The children were nestled all snug in their beds, while visions of sugar plums danced in their heads.

### Custom Icons

Emojis are already a pretty good starting point as far as default icon options go! There are a _lot_ of 'em, and they're supported across nearly all platforms. But what if we're going for a different look, or need to match our docs to a branding kit? Icons are a big part of setting the "tone" for your site.

With a touch of Custom CSS, we should be able to get a callout using the 📷 emoji to display an icon font glyph!

```css Custom CSS
.callout[theme='📷'] {
  --emoji: unset;
  --icon: '\f030'; /* https://fontawesome.com/icons/camera?f=classic&s=solid */
  --icon-color: #c50a50;
}
```

```Markdown Syntax
> 📷 Cool pix!
>
> Vitae reprehenderit at aliquid error voluptates eum dignissimos.
```

This works like a charm:

<div id="my-theme">

> 📸 Cool pix!
> Vitae reprehenderit at aliquid error voluptates eum dignissimos.

<HTMLBlock>{`

<style>
#my-theme .callout[theme=📸] {
  --emoji: unset;
  --icon: \"\";
}
#my-theme .callout[theme=📷],
#my-theme .callout[theme=📸] {
  --icon-color: #c50a50;
  --border: var(--icon-color);
  --title: var(--icon-color);
}
summary {
  outline: none;
  user-select: none;
}
</style>`}
</HTMLBlock>

</div>

<hr />
<details>
  <summary><em>Setting the Custom Icon Font</em></summary><br />

The custom icon font defaults to `Font Awesome 6 Pro`.

```css
.callout[theme='📷'] {
  --icon-font: 'Font Awesome 6 Pro';
}
```

</details>
<hr />

## Edge Cases

<details>
  <summary>Callouts don't need to have any body text:</summary><br />

```
> 🥇  No body text.
```

</details>

> 🥇 No body text.

<details>
  <summary>You can also skip the title, if you're so inclined!</summary><br />

```
> 🥈
>
> Lorem ipsum dolor sit amet consectetur adipisicing elit. Error eos animi obcaecati quod repudiandae aliquid nemo veritatis ex, quos delectus minus sit omnis vel dolores libero, recusandae ea dignissimos iure?
```

</details>

> 🥈
>
> Lorem ipsum dolor sit amet consectetur adipisicing elit. Error eos animi obcaecati quod repudiandae aliquid nemo veritatis ex, quos delectus minus sit omnis vel dolores libero, recusandae ea dignissimos iure?
