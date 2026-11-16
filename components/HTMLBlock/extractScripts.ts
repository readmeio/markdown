// ASCII whitespace plus `/` and `>`, the only characters HTML allows after a tag name.
// A word boundary also matches `-`, so `</script-example>` must not close a script.
const HTML_TAG_DELIMITERS = new Set([' ', '\t', '\n', '\f', '\r', '/', '>']);

const SCRIPT_NAME = 'script';
// Lookbehind covers `<script` when its delimiter is the first surviving character.
// A closer is longer (`</script`) and is never where the next scan starts.
const SPLIT_TAG_LOOKBEHIND = '<script'.length;

// Node ids are indexes into `html`. Cuts rewire `next`/`prev` and never reorder,
// so ids stay in document order and `<` compares them.
interface CharList {
  html: string;
  next: Int32Array;
  prev: Int32Array;
}

interface ScriptMatch {
  bodyEnd: number;
  bodyStart: number;
  end: number;
  start: number;
}

interface ScriptTag {
  closing: boolean;
  delimiter: number;
  start: number;
}

const step = (list: CharList, node: number, count: number): number => {
  let current = node;
  for (let i = 0; i < count && current !== -1; i += 1) current = list.next[current];
  return current;
};

const isScriptName = (list: CharList, node: number): boolean => {
  let current = node;
  for (let i = 0; i < SCRIPT_NAME.length; i += 1) {
    if (current === -1) return false;
    const char = list.html[current];
    if (char !== SCRIPT_NAME[i] && char.toLowerCase() !== SCRIPT_NAME[i]) return false;
    current = list.next[current];
  }
  return true;
};

const rewind = (list: CharList, node: number, count: number): number => {
  let current = node;
  for (let i = 0; i < count && current !== -1; i += 1) {
    if (list.prev[current] === -1) return current;
    current = list.prev[current];
  }
  return current;
};

const readUntil = (list: CharList, start: number, end: number): string => {
  if (start === -1 || start === end) return '';
  const chars: string[] = [];
  let current = start;
  while (current !== -1 && current !== end) {
    chars.push(list.html[current]);
    current = list.next[current];
  }
  return chars.join('');
};

const findChar = (list: CharList, start: number, char: string): number => {
  let current = start;
  while (current !== -1 && list.html[current] !== char) current = list.next[current];
  return current;
};

// `<script` or `</script`, then an HTML delimiter. The name and the delimiter are one check.
const readScriptTag = (list: CharList, at: number): ScriptTag | null => {
  if (at === -1 || list.html[at] !== '<') return null;
  let name = list.next[at];
  if (name === -1) return null;

  const closing = list.html[name] === '/';
  if (closing) {
    name = list.next[name];
    if (name === -1) return null;
  }
  if (!isScriptName(list, name)) return null;

  const delimiter = step(list, name, SCRIPT_NAME.length);
  if (delimiter === -1 || !HTML_TAG_DELIMITERS.has(list.html[delimiter])) return null;
  return { closing, delimiter, start: at };
};

const findTag = (list: CharList, start: number, kind: 'close' | 'open'): ScriptTag | null => {
  const closing = kind === 'close';
  let current = start;
  while (current !== -1) {
    const tag = readScriptTag(list, current);
    if (tag && tag.closing === closing) return tag;
    current = list.next[current];
  }
  return null;
};

// An opener with no closer would consume any later end tag, so the scan stops instead of resuming.
const findNextScript = (list: CharList, start: number): ScriptMatch | null => {
  const opener = findTag(list, start, 'open');
  if (!opener) return null;

  const openEnd = findChar(list, opener.delimiter, '>');
  if (openEnd === -1) return null;
  const closer = findTag(list, list.next[openEnd], 'close');
  if (!closer) return null;
  const closeEnd = findChar(list, closer.delimiter, '>');
  if (closeEnd === -1) return null;

  let end = list.next[closeEnd];
  if (end !== -1 && list.html[end] === '\n') end = list.next[end];
  return {
    bodyEnd: closer.start,
    bodyStart: list.next[openEnd],
    end,
    start: opener.start,
  };
};

const createCharList = (html: string): CharList => {
  const { length } = html;
  const next = new Int32Array(length);
  const prev = new Int32Array(length);
  for (let i = 0; i < length; i += 1) {
    next[i] = i + 1 < length ? i + 1 : -1;
    prev[i] = i - 1;
  }
  return { html, next, prev };
};

// Surviving characters keep their original order. Unlinking a match is a pointer update, not a copy.
const unlink = (list: CharList, head: number, start: number, end: number): number => {
  const before = list.prev[start];
  if (before !== -1) list.next[before] = end;
  // A match at the start has no predecessor. The next character must not keep
  // pointing into the removed tag, or the following match is spliced from there.
  if (end !== -1) list.prev[end] = before;
  return before === -1 ? end : head;
};

// A join is the first surviving character after a cut. Adjacent matches share that boundary.
const survivingJoins = (matches: ScriptMatch[]): number[] => {
  const joins: number[] = [];
  for (let i = 0; i < matches.length; i += 1) {
    const { end } = matches[i];
    const later = matches[i + 1];
    if (end !== -1 && end !== later?.start) joins.push(end);
  }
  return joins;
};

// The first pass (`joins === null`) reads the whole string. Later passes skip to each
// join; a new opener cannot start more than SPLIT_TAG_LOOKBEHIND live characters before one.
const collectScripts = (list: CharList, from: number, joins: number[] | null): ScriptMatch[] => {
  const matches: ScriptMatch[] = [];
  let joinIndex = 0;
  let current = from;
  while (current !== -1) {
    const match = findNextScript(list, current);
    if (!match) break;
    matches.push(match);
    current = match.end;
    if (joins) {
      while (joinIndex < joins.length && joins[joinIndex] < match.end) joinIndex += 1;
      if (joinIndex >= joins.length) break;
      const resume = rewind(list, joins[joinIndex], SPLIT_TAG_LOOKBEHIND);
      if (current !== -1 && resume !== -1 && current < resume) current = resume;
    }
  }
  return matches;
};

// Pull out the `<script>` elements a browser would run, then delete any tag a cut
// assembles. Only the first pass is executed; later passes only strip.
export const extractScripts = (html: string): { html: string; scripts: string[] } => {
  if (!html) return { html: '', scripts: [] };

  const list = createCharList(html);
  const scripts: string[] = [];
  let head = 0;
  let cursor = 0;
  let joins: number[] | null = null;

  while (cursor !== -1 && head !== -1) {
    const matches = collectScripts(list, cursor, joins);
    if (!matches.length) break;

    // A tag that appears only after a cut is plain text to a browser, so it is
    // removed and not executed. `joins` is null until the first cut.
    if (joins === null) {
      for (let i = 0; i < matches.length; i += 1) {
        scripts.push(readUntil(list, matches[i].bodyStart, matches[i].bodyEnd));
      }
    }
    const nextJoins = survivingJoins(matches);
    for (let i = 0; i < matches.length; i += 1) {
      head = unlink(list, head, matches[i].start, matches[i].end);
    }
    if (!nextJoins.length) break;

    joins = nextJoins;
    cursor = rewind(list, joins[0], SPLIT_TAG_LOOKBEHIND);
  }

  if (!scripts.length) return { html, scripts };
  return { html: head === -1 ? '' : readUntil(list, head, -1), scripts };
};
