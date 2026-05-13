// HTML void elements never have a closing tag.
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

type TagKind = 'close' | 'open' | 'selfClose';

interface TagToken {
  end: number;
  kind: TagKind;
  name: string;
  start: number;
}

const isNameChar = (ch: string): boolean => /[A-Za-z0-9_.-]/.test(ch);
const isNameStart = (ch: string | undefined): boolean => !!ch && /[A-Za-z]/.test(ch);

/**
 * Return index just after `delim`, or -1 if not found from `from`.
 */
const skipUntil = (src: string, from: number, delim: string): number => {
  const idx = src.indexOf(delim, from);
  return idx === -1 ? -1 : idx + delim.length;
};

/**
 * Walk a single tag starting at `src[i]` (which must be `<`). Returns the
 * parsed token plus the index immediately after it, or `null` if no tag was
 * recognized (in which case the caller should advance by 1).
 */
const readTag = (src: string, i: number): { next: number; token: TagToken } | null => {
  const start = i;
  let j = i + 1;
  const isClose = src[j] === '/';
  if (isClose) j += 1;

  if (!isNameStart(src[j])) return null;
  const nameStart = j;
  while (j < src.length && isNameChar(src[j])) j += 1;
  const name = src.slice(nameStart, j);

  // Walk attributes; track `{...}` depth and quoted strings so a `>` inside
  // either doesn't prematurely close the tag.
  let braceDepth = 0;
  let quote: string | null = null;
  while (j < src.length) {
    const c = src[j];
    if (quote) {
      if (c === '\\') {
        j += 2;
      } else {
        if (c === quote) quote = null;
        j += 1;
      }
    } else if (c === '"' || c === "'") {
      quote = c;
      j += 1;
    } else if (c === '{') {
      braceDepth += 1;
      j += 1;
    } else if (c === '}') {
      if (braceDepth > 0) braceDepth -= 1;
      j += 1;
    } else if (c === '>' && braceDepth === 0) {
      break;
    } else {
      j += 1;
    }
  }

  if (j >= src.length) return null;

  const selfClose = src[j - 1] === '/';
  let kind: TagKind = 'open';
  if (isClose) kind = 'close';
  else if (selfClose) kind = 'selfClose';

  return { token: { kind, name, start, end: j + 1 }, next: j + 1 };
};

/**
 * Tokenize HTML-like tags from `src`, skipping over content that must not be
 * interpreted as tags: fenced code blocks, inline code spans, HTML comments,
 * and CDATA sections.
 */
const tokenizeTags = (src: string): TagToken[] => {
  const tokens: TagToken[] = [];
  let i = 0;

  while (i < src.length) {
    if (src.startsWith('```', i)) {
      const next = skipUntil(src, i + 3, '```');
      i = next === -1 ? src.length : next;
    } else if (src[i] === '`') {
      let run = 0;
      while (src[i + run] === '`') run += 1;
      const delim = '`'.repeat(run);
      const next = skipUntil(src, i + run, delim);
      // Unterminated inline code: just advance past the opener and keep scanning.
      i = next === -1 ? i + run : next;
    } else if (src.startsWith('<!--', i)) {
      const next = skipUntil(src, i + 4, '-->');
      i = next === -1 ? src.length : next;
    } else if (src.startsWith('<![CDATA[', i)) {
      const next = skipUntil(src, i + 9, ']]>');
      i = next === -1 ? src.length : next;
    } else if (src[i] === '<') {
      const result = readTag(src, i);
      if (result) {
        tokens.push(result.token);
        i = result.next;
      } else {
        i += 1;
      }
    } else {
      i += 1;
    }
  }

  return tokens;
};

const findMatchIdx = (stack: string[], name: string): number => {
  const exact = stack.lastIndexOf(name);
  if (exact !== -1) return exact;
  const lower = name.toLowerCase();
  return stack.map(s => s.toLowerCase()).lastIndexOf(lower);
};

/**
 * Rewrites `html` so every open tag has a matching close. Returns the input
 * unchanged when nothing needed repair, so callers can cheaply detect no-ops.
 *
 * - Void elements (`<br>`, `<img>`, …) and self-closing tags are not stacked.
 * - When a close tag doesn't match the top of the stack but does match
 *   something further down (e.g. `<b><i>x</b>`), synthetic closers for the
 *   intermediates are spliced in just before the close tag (`<b><i>x</i></b>`).
 * - Close tags with no matching open are left as-is — escaping them belongs to
 *   a different layer.
 * - Tags still open at end-of-input get synthetic closers appended.
 *
 * Scoped to a known-malformed retry path — the happy path never calls this.
 */
export const repairUnclosedTags = (html: string): string => {
  const tokens = tokenizeTags(html);
  const stack: string[] = [];
  let out = '';
  let cursor = 0;
  let repaired = false;

  tokens.forEach(token => {
    if (token.kind === 'selfClose') return;
    if (VOID_ELEMENTS.has(token.name.toLowerCase())) return;

    if (token.kind === 'open') {
      stack.push(token.name);
      return;
    }

    const matchIdx = findMatchIdx(stack, token.name);
    if (matchIdx === -1) return;

    const intermediates = stack.slice(matchIdx + 1);
    if (intermediates.length > 0) {
      out += html.slice(cursor, token.start);
      for (let i = intermediates.length - 1; i >= 0; i -= 1) {
        out += `</${intermediates[i]}>`;
      }
      cursor = token.start;
      repaired = true;
    }
    stack.length = matchIdx;
  });

  if (stack.length === 0 && !repaired) return html;

  out += html.slice(cursor);
  if (stack.length > 0) {
    for (let i = stack.length - 1; i >= 0; i -= 1) {
      out += `</${stack[i]}>`;
    }
    repaired = true;
  }

  return repaired ? out : html;
};
