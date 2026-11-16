# `compact-headings` Fixture

Markdown headings without a space after the hash — legacy rdmd accepted
this form, MDX/MDXish did not until PR #1428's preprocessor was added.
This was a persistent migration pain point for customers moving from
legacy to MDX/MDXish.

## Source bugs

- PR #1428 — `#Heading` without space was not treated as a heading; customers migrating from legacy rdmd hit this constantly

## What flips this fixture

Changes to the `normalizeCompactHeadings()` preprocessor or any
heading-tokenizer change that affects the leading-hash detection regex.
