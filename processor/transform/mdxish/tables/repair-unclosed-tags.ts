import { walkTags } from './tag-walker';
import { applyInserts, type Insert } from './utils';

// HTML void elements never have a closing tag. htmlparser2 already handles
// these in HTML mode, but we still skip them defensively in case a void shows
// up as an implicit close.
const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
]);

/**
 * MDX requires a JSX inline tag and its closer to live on the same line — not
 * just the same paragraph. (`<td>\nArray <object>\n</object></td>` still
 * throws even though there's no blank line between open and close.) When the
 * open and the auto-close trigger sit on different lines, return the offset
 * of the first newline after the open so the synthetic closer lands at the
 * end of the open's line. If they share a line (e.g. `<b><i>x</b>`), return
 * the trigger position.
 */
const findCloserOffset = (html: string, openEnd: number, triggerStart: number): number => {
  const newlineIdx = html.slice(openEnd, triggerStart).indexOf('\n');
  return newlineIdx === -1 ? triggerStart : openEnd + newlineIdx;
};

/**
 * Rewrites `html` so every open tag has a matching close. Returns the input
 * unchanged when nothing needed repair, so callers can cheaply detect no-ops.
 *
 * Detection runs through htmlparser2: any close event flagged `implicit` is
 * a tag the user opened but didn't explicitly close. We pair it with the
 * matching opener (popped from a stack we maintain) and insert `</name>` at
 * the end of the opener's line, or at the trigger if they're on the same line.
 *
 * Scoped to a known-malformed retry path — the happy path never calls this.
 */
export const repairUnclosedTags = (html: string): string => {
  const inserts: Insert[] = [];
  const openStack: { end: number; name: string }[] = [];

  walkTags(html, {
    onOpen({ name, end }) {
      if (VOID_ELEMENTS.has(name.toLowerCase())) {
        // MDX requires void elements to be self-closing (`<br/>`, not `<br>`).
        // If the source open tag doesn't end with `/`, inject one before the
        // `>` so it parses. `end` is one past `>`, so `end - 2` is the char
        // immediately before `>`.
        if (html[end - 2] !== '/') inserts.push({ offset: end - 1, text: '/' });
        return;
      }
      openStack.push({ name, end });
    },
    onClose({ name, start, implicit }) {
      if (VOID_ELEMENTS.has(name.toLowerCase())) return;
      const opener = openStack.pop();
      if (!implicit || !opener) return;
      inserts.push({ offset: findCloserOffset(html, opener.end, start), text: `</${name}>` });
    },
  });

  return applyInserts(html, inserts);
};
