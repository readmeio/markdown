import React from 'react';

/** Marks text the browser and our translations must leave as is. */
const DNT = ({ children }: React.PropsWithChildren) => <span translate="no">{children}</span>;

const DNT_IN_TEXT_RE = /<DNT(?:\s[^>]*)?>([\s\S]*?)<\/DNT>/;

// A string prop (a title) is plain text in both engines, so no tag renders there.
// DNT is the one tag read out of it, by product call, so the name still shows as one.
export const dntTagsToSpans = (text: string | undefined): React.ReactNode =>
  text && DNT_IN_TEXT_RE.test(text) ? (
    // One node, so a flex title (Accordion, Card) keeps the spaces around the span.
    <span>{text.split(DNT_IN_TEXT_RE).map((part, i) => (i % 2 ? <DNT key={i}>{part}</DNT> : part))}</span>
  ) : (
    text
  );

export default DNT;
