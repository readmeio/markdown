import { VARIABLE_REGEXP } from '@readme/variable';

const legacyVariableRegex = new RegExp(VARIABLE_REGEXP, 'giu');

export function replaceLegacyVariablesInText(text: string): string {
  return text.replace(legacyVariableRegex, (match, capture) => {
    const unescaped = match.replace(/^\\<</, '<<').replace(/\\>>$/, '>>');
    if (unescaped !== match) return unescaped;

    const name = String(capture || '').trim();
    if (name.startsWith('glossary:')) return name.toUpperCase();
    return `{user.${name}}`;
  });
}

function isLineStart(text: string, index: number): boolean {
  return index === 0 || text[index - 1] === '\n';
}

export function replaceLegacyVariablesInCode(content: string): string {
  let i = 0;
  let out = '';

  while (i < content.length) {
    if (isLineStart(content, i) && content.startsWith('```', i)) {
      const fenceLineEnd = content.indexOf('\n', i);
      if (fenceLineEnd === -1) {
        out += content.slice(i);
        break;
      }

      out += content.slice(i, fenceLineEnd + 1);
      i = fenceLineEnd + 1;

      let close = -1;
      let scan = i;
      while (scan < content.length) {
        const lineEnd = content.indexOf('\n', scan);
        const lineStart = lineEnd === -1 ? scan : lineEnd + 1;
        if (isLineStart(content, lineStart) && content.startsWith('```', lineStart)) {
          close = lineStart;
          break;
        }
        if (lineEnd === -1) break;
        scan = lineStart;
      }

      if (close === -1) {
      out += replaceLegacyVariablesInText(content.slice(i));
        break;
      }

      out += replaceLegacyVariablesInText(content.slice(i, close));
      const closeLineEnd = content.indexOf('\n', close);
      if (closeLineEnd === -1) {
        out += content.slice(close);
        break;
      }
      out += content.slice(close, closeLineEnd + 1);
      i = closeLineEnd + 1;
      // eslint-disable-next-line no-continue
      continue;
    }

    if (content[i] === '`') {
      const end = content.indexOf('`', i + 1);
      if (end === -1) {
        out += content.slice(i);
        break;
      }
      out += `\`${replaceLegacyVariablesInText(content.slice(i + 1, end))}\``;
      i = end + 1;
      // eslint-disable-next-line no-continue
      continue;
    }

    out += content[i];
    i += 1;
  }

  return out;
}
