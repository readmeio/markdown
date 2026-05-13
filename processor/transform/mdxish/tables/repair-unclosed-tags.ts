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

/**
 * Rewrites `html` so every open tag has a matching close. Returns the input
 * unchanged when nothing needed repair, so callers can cheaply detect no-ops.
 *
 * Detection runs through htmlparser2: any `</tag>` event flagged `implicit`
 * by the parser is a tag the user opened but didn't explicitly close. We
 * insert the synthetic closer at that event's `startIndex` — for mid-stream
 * mismatches that's right before the close tag that triggered the auto-close
 * (so `<b><i>x</b>` becomes `<b><i>x</i></b>`); for end-of-input that's the
 * end of the string.
 *
 * Scoped to a known-malformed retry path — the happy path never calls this.
 */
export const repairUnclosedTags = (html: string): string => {
  const masked = maskCodeRegions(html);
  const inserts: CloseInsert[] = [];

  const parser: Parser = new Parser(
    {
      onclosetag(name, implicit) {
        if (!implicit) return;
        if (VOID_ELEMENTS.has(name.toLowerCase())) return;
        inserts.push({ name, offset: parser.startIndex });
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

  // Inserts come out in document order; same-offset entries are innermost-first
  // (htmlparser2 unwinds the stack bottom-up). Walking in order with a cursor
  // preserves that nesting and avoids the offset-drift you'd hit if you spliced
  // in arbitrary order.
  let out = '';
  let cursor = 0;
  inserts.forEach(({ name, offset }) => {
    const clamped = Math.min(offset, html.length);
    if (clamped > cursor) {
      out += html.slice(cursor, clamped);
      cursor = clamped;
    }
    out += `</${name}>`;
  });
  out += html.slice(cursor);
  return out;
};
