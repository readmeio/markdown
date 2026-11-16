const CSS_STRING = /"((?:\\.|[^"\\])*)"/g;
const CSS_HEX_ESCAPE = /\\([0-9a-fA-F]{1,6})\s?/g;
const CSS_SIMPLE_ESCAPE = /\\(.)/g;

/**
 * Quoted CSS `content` (`"\\f030"`, or the glyph itself) as the characters to load.
 * `getComputedStyle` reports either form; both have to reach `document.fonts.load`.
 */
export function cssContentText(content: string) {
  if (!content || content === 'none' || content === 'normal') return '';
  // Hoisted global regexes keep lastIndex. matchAll starts from wherever the last call left it.
  CSS_STRING.lastIndex = 0;
  return [...content.matchAll(CSS_STRING)]
    .map(([, value]) =>
      value
        .replace(CSS_HEX_ESCAPE, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
        .replace(CSS_SIMPLE_ESCAPE, '$1'),
    )
    .join('');
}
