We've also built a lot of great features right in to the ReadMe app, which work on top of our markdown engine to give your developers a best-in-class documentation experience. These features aren't all baked in to the new engine itself, but they're worth mentioning nonetheless!

## Sectioning Semantics

- Automatic **table of contents** based on sections.
- Generated **[heading anchor links](doc:headings#section-incremented-anchors)**.

## Data Injection

#### User Variables

If you've set up JWT logins and user variables in your ReadMe project, you can use the double angle-bracket notation for variable expansions. So if you're logged in to and have a `name` variable set, then this...

    Hi, my name is **<<name>>**!

...should expand to this: “Hi, my name is **<<name>>**!”

#### Glossary Terms

Did you know you can define various technical terms for your ReadMe project? Using our glossary feature, these terms can be used anywhere in your Markdown! Just use the same double angle-bracket syntax you would for user variables with a “glossary:” prefix before the term, like so:

    Both **<<glossary:exogenous>>** and **<<glossary:endogenous>>** are long words.

Which expands to: “Both **<<glossary:exogenous>>** and **<<glossary:endogenous>>** are long words.”

#### Emoji Shortcodes

You can use GitHub-style emoji short codes (feat. Owlbert!)

    :sparkles: :owlbert-reading:

This expands out to: “:sparkles: :owlbert-reading:”
