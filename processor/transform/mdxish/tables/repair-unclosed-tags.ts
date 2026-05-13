import { Parser } from 'htmlparser2';

// HTML void elements never have a closing tag. htmlparser2 already handles
// these in HTML mode, but we still need the set to skip repair for any voids
// that get emitted as implicit closes.
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
 * Replace fenced code blocks and inline code spans with same-length whitespace
 * so htmlparser2 doesn't try to parse `<` inside code as tags. We feed the
 * masked string to the parser purely for tag detection — final string-splicing
 * happens against the original `html`, so offsets line up either way.
 *
 * htmlparser2 already understands JSX expression attributes (`align={[…]}`,
 * `style={{ … }}`), so those don't need masking.
 */
const maskCodeRegions = (html: string): string =>
  html.replace(/```[\s\S]*?```|``(?:[^`]|`(?!`))*``|`[^`\n]*`/g, m => ' '.repeat(m.length));

interface CloseInsert {
  name: string;
  offset: number;
}

interface OpenFrame {
  end: number;
  name: string;
}

/**
 * MDX requires a JSX inline tag and its closer to live on the same line — not
 * just the same paragraph. (`<td>\nArray <object>\n</object></td>` still
 * throws even though there's no blank line between open and close.) When the
 * open and the auto-close trigger sit on different lines, insert the synthetic
 * closer at the first `\n` after the open so it lands at the end of the open's
 * line. If they're on the same line (e.g. `<b><i>x</b>`), insert at the trigger.
 */
const findInsertOffset = (html: string, openEnd: number, triggerStart: number): number => {
  const slice = html.slice(openEnd, triggerStart);
  const newlineIdx = slice.indexOf('\n');
  return newlineIdx === -1 ? triggerStart : openEnd + newlineIdx;
};

/**
 * Rewrites `html` so every open tag has a matching close. Returns the input
 * unchanged when nothing needed repair, so callers can cheaply detect no-ops.
 *
 * Detection runs through htmlparser2: any `</tag>` event flagged `implicit`
 * by the parser is a tag the user opened but didn't explicitly close. We
 * insert the synthetic closer either at the first blank line after the open
 * (so it lands in the same paragraph as MDX requires) or at the trigger
 * position if the open and trigger share a paragraph.
 *
 * Scoped to a known-malformed retry path — the happy path never calls this.
 */
export const repairUnclosedTags = (html: string): string => {
  const masked = maskCodeRegions(html);
  const inserts: CloseInsert[] = [];
  const openStack: OpenFrame[] = [];

  const parser: Parser = new Parser(
    {
      onopentag(name) {
        if (VOID_ELEMENTS.has(name.toLowerCase())) return;
        openStack.push({ name, end: parser.endIndex + 1 });
      },
      onclosetag(name, implicit) {
        if (VOID_ELEMENTS.has(name.toLowerCase())) return;
        const opener = openStack.pop();
        if (!implicit || !opener) return;
        const offset = findInsertOffset(html, opener.end, parser.startIndex);
        inserts.push({ name, offset });
      },
    },
    {
      lowerCaseTags: false,
      lowerCaseAttributeNames: false,
      recognizeSelfClosing: true,
    },
  );
  parser.write(masked);
  parser.end();

  if (inserts.length === 0) return html;

  // Repositioning inserts to blank-line offsets can break document order
  // (htmlparser2 unwinds the stack inner-first, but an inner tag's blank line
  // may sit earlier than the outer's). Stable-sort by offset ascending so the
  // cursor walks forward; ties keep htmlparser2's innermost-first order, which
  // yields the correct `</inner></outer>` nesting at shared offsets.
  inserts.sort((a, b) => a.offset - b.offset);

  let out = '';
  let cursor = 0;
  inserts.forEach(({ name, offset }) => {
    const clamped = Math.min(Math.max(offset, cursor), html.length);
    if (clamped > cursor) {
      out += html.slice(cursor, clamped);
      cursor = clamped;
    }
    out += `</${name}>`;
  });
  out += html.slice(cursor);
  return out;
};
