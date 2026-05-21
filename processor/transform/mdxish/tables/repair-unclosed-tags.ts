import { HTML_VOID_ELEMENTS, STANDARD_HTML_TAGS } from '../../../../utils/common-html-words';

import { maskNonTagRegions, walkTags } from './tag-walker';
import { applyInserts, type Insert, type RepairResult } from './utils';

const isStandardHtmlTag = (name: string): boolean => STANDARD_HTML_TAGS.has(name.toLowerCase());

// Intentionally simpler than htmlparser2: `[^>]*` does not honor `>` inside
// quoted attribute values. That's acceptable here because the main walker
// (htmlparser2) handles attribute parsing; this scan only needs to locate
// orphan closers, which can't appear inside an attribute value anyway.
const HTML_TAG_TOKEN_RE = /<(\/)?([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*>/g;

/**
 * htmlparser2 silently drops closing tags that have no matching opener
 * (e.g. the trailing `</li>` in `<ul><li>x</ul></li>`), leaving them in the
 * source makes mdxjs choke on the dangling closer. Scan the masked
 * source for `</name>` tokens that don't pair with any prior unmatched
 * `<name>` and return their spans so the caller can drop them.
 */
const findOrphanClosers = (html: string): { length: number; offset: number }[] => {
  const masked = maskNonTagRegions(html);
  const stack: string[] = [];
  const orphans: { length: number; offset: number }[] = [];
  HTML_TAG_TOKEN_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = HTML_TAG_TOKEN_RE.exec(masked)) !== null) {
    const name = match[2].toLowerCase();
    // Non-HTML names and void elements are handled by the main walker.
    // eslint-disable-next-line no-continue
    if (!isStandardHtmlTag(name) || HTML_VOID_ELEMENTS.has(name)) continue;
    if (match[1] === '/') {
      const idx = stack.lastIndexOf(name);
      if (idx === -1) orphans.push({ offset: match.index, length: match[0].length });
      else stack.length = idx;
    } else if (!match[0].endsWith('/>')) {
      stack.push(name);
    }
  }
  return orphans;
};

/**
 * MDX requires a JSX inline tag and its closer to live on the same line — not
 * just the same paragraph. (`<td>\nArray <object>\n</object></td>` still
 * throws even though there's no blank line between open and close.)
 *
 * When a pair of tags sit on different lines, return the offset of the first newline
 * after the open so the synthetic closer lands at the end of the open's line.
 * If they share a line (e.g. `<b><i>x</b>`), just use the position htmlparser2
 * decides the unclosed tag must be closed at by
 */
const findOffsetToPlaceCloser = (html: string, openTagEnd: number, forcedCloseAt: number): number => {
  const newlineIdx = html.slice(openTagEnd, forcedCloseAt).indexOf('\n');
  return newlineIdx === -1 ? forcedCloseAt : openTagEnd + newlineIdx;
};

/**
 * Rewrites `html` so every open tag has a matching close. Returns the input
 * unchanged when nothing needed repair, so callers can cheaply detect no-ops.
 *
 * Detection runs through htmlparser2: any close event flagged `implicit` is
 * a tag the user opened but didn't explicitly close. We pair it with the
 * matching opener (popped from a stack we maintain) and insert `</name>` at
 * the end of the opener's line, or at the trigger if they're on the same line.
 */
export const repairUnclosedTags = (html: string): RepairResult => {
  const inserts: Insert[] = [];
  const openTags: { end: number; name: string; start: number }[] = [];

  walkTags(html, {
    onOpen({ name, start, end }) {
      // Escape non-HTML names (custom components, typos, `<arbitrary-tag>`)
      // so MDX treats them as literal text instead of expecting a closer
      if (!isStandardHtmlTag(name)) {
        inserts.push({ offset: start, text: '\\' });
        return;
      }
      if (HTML_VOID_ELEMENTS.has(name.toLowerCase())) {
        // MDX requires void elements to be self-closing (`<br/>`, not `<br>`).
        // If the source open tag doesn't end with `/`, inject one before the
        // `>` so it parses. `end` is one past `>`, so `end - 2` is the char
        // immediately before `>`.
        if (html[end - 2] !== '/') inserts.push({ offset: end - 1, text: '/' });
        return;
      }
      openTags.push({ name, start, end });
    },
    onClose({ name, start, implicit }) {
      if (HTML_VOID_ELEMENTS.has(name.toLowerCase())) return;
      if (!isStandardHtmlTag(name)) return;
      const openTag = openTags.pop();
      if (!implicit || !openTag) return;
      inserts.push({ offset: findOffsetToPlaceCloser(html, openTag.end, start), text: `</${name}>` });
    },
  });

  findOrphanClosers(html).forEach(({ offset, length }) =>
    inserts.push({ offset, text: '', consumes: length }),
  );

  return applyInserts(html, inserts);
};
