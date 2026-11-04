// ASCII whitespace plus `/` and `>`, the only characters HTML allows after a tag name.
// A word boundary also matches `-`, so `</script-example>` must not close a script.
const HTML_TAG_DELIMITERS = new Set([' ', '\t', '\n', '\f', '\r', '/', '>']);

const SCRIPT_NAME = 'script';
// `<script` is 7 characters. A tag split by a deletion starts at most this far before the join.
const SPLIT_TAG_LOOKBEHIND = 7;

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

// The end tag is `</script` followed by a delimiter. Anything up to the next `>` is the tag's tail.
const findCloser = (list: CharList, start: number): { delimiter: number; start: number } | null => {
  let current = start;
  while (current !== -1) {
    const slash = list.html[current] === '<' ? list.next[current] : -1;
    const name = slash !== -1 && list.html[slash] === '/' ? list.next[slash] : -1;
    const delimiter = name === -1 ? -1 : step(list, name, SCRIPT_NAME.length);
    if (name !== -1 && isScriptName(list, name) && delimiter !== -1 && HTML_TAG_DELIMITERS.has(list.html[delimiter])) {
      return { delimiter, start: current };
    }
    current = list.next[current];
  }
  return null;
};

// An opener with no closer would consume any later end tag, so the scan stops instead of resuming.
const findNextScript = (list: CharList, start: number): ScriptMatch | null => {
  let current = start;
  while (current !== -1) {
    const name = list.html[current] === '<' ? list.next[current] : -1;
    const delimiter = name === -1 ? -1 : step(list, name, SCRIPT_NAME.length);
    if (name !== -1 && isScriptName(list, name) && delimiter !== -1 && HTML_TAG_DELIMITERS.has(list.html[delimiter])) {
      const openEnd = findChar(list, delimiter, '>');
      if (openEnd === -1) return null;
      const closer = findCloser(list, list.next[openEnd]);
      if (!closer) return null;
      const closeEnd = findChar(list, closer.delimiter, '>');
      if (closeEnd === -1) return null;
      let end = list.next[closeEnd];
      if (end !== -1 && list.html[end] === '\n') end = list.next[end];
      return { bodyEnd: closer.start, bodyStart: list.next[openEnd], end, start: current };
    }
    current = list.next[current];
  }
  return null;
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

// A join is the first character after a removed match. Adjacent matches share one join.
const survivingJoins = (matches: ScriptMatch[]): number[] => {
  const joins: number[] = [];
  for (let i = 0; i < matches.length; i += 1) {
    const { end } = matches[i];
    const later = matches[i + 1];
    const covered = later && end >= later.start && (later.end === -1 || end < later.end);
    if (end !== -1 && !covered) joins.push(end);
  }
  return joins;
};

// Pull out `<script>` elements, including tags assembled by removing a nested script.
// Each pass deletes every current match, then resumes within 7 characters of a join.
export const extractScripts = (html: string): { html: string; scripts: string[] } => {
  if (!html) return { html: '', scripts: [] };

  const list = createCharList(html);
  const scripts: string[] = [];
  let head = 0;
  let cursor = 0;
  // `null` on the first pass, which has to read the whole string. Later passes only
  // revisit deletion joins; a new tag cannot start more than 7 characters before one.
  let joins: number[] | null = null;

  while (cursor !== -1 && head !== -1) {
    const matches: ScriptMatch[] = [];
    let joinIndex = 0;
    let current = cursor;
    while (current !== -1) {
      const match = findNextScript(list, current);
      if (!match) break;
      matches.push(match);
      current = match.end;
      if (joins) {
        while (joinIndex < joins.length && joins[joinIndex] < match.end) joinIndex += 1;
        if (joinIndex >= joins.length) break;
        const jump = rewind(list, joins[joinIndex], SPLIT_TAG_LOOKBEHIND);
        if (current !== -1 && jump !== -1 && current < jump) current = jump;
      }
    }

    if (!matches.length) break;

    matches.forEach(match => {
      scripts.push(readUntil(list, match.bodyStart, match.bodyEnd));
    });
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
