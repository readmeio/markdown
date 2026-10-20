import React from 'react';

/** Marks text the browser and our translations must leave as is. */
const NoTranslate = ({ children }: React.PropsWithChildren) => <span translate="no">{children}</span>;

const NO_TRANSLATE_IN_TEXT_RE = /<NoTranslate(?:\s[^>]*)?>([\s\S]*?)<\/NoTranslate>/;

// A string prop (a title) is plain text in both engines, so no tag renders there.
// NoTranslate is the one tag read out of it, by product call, so the name still shows as one.
export const noTranslateTagsToSpans = (text: string | undefined): React.ReactNode =>
  text && NO_TRANSLATE_IN_TEXT_RE.test(text) ? (
    // One node, so a flex title (Accordion, Card) keeps the spaces around the span.
    <span>{text.split(NO_TRANSLATE_IN_TEXT_RE).map((part, i) => (i % 2 ? <NoTranslate key={i}>{part}</NoTranslate> : part))}</span>
  ) : (
    text
  );

export default NoTranslate;
