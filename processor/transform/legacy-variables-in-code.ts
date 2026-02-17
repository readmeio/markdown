import { VARIABLE_REGEXP } from '@readme/variable';

const legacyVariableRegex = new RegExp(VARIABLE_REGEXP, 'giu');

// Converts legacy <<variable>> syntax to {user.*} syntax
export function convertLegacyVariables(text: string): string {
  return text.replace(legacyVariableRegex, (match, capture) => {
    const unescaped = match.replace(/^\\<</, '<<').replace(/\\>>$/, '>>');
    if (unescaped !== match) return unescaped;

    // Note: Glossary terms inside code blocks doesn't get resolved (legacy behaviour)
    const name = String(capture || '').trim();
    if (name.startsWith('glossary:')) return name.toUpperCase();

    // Taken from readme-to-mdx.ts
    const validIdentifier = name.match(/^(\p{Letter}|[$_])(\p{Letter}|[$_0-9])*$/u);
    const value = validIdentifier ? `user.${name}` : `user[${JSON.stringify(name)}]`;
    return `{${value}}`;
  });
}

function isLineStart(text: string, index: number): boolean {
  return index === 0 || text[index - 1] === '\n';
}

function findClosingFence(text: string, start: number): number {
  let scan = start;
  while (scan < text.length) {
    const lineEnd = text.indexOf('\n', scan);
    const lineStart = lineEnd === -1 ? scan : lineEnd + 1;
    if (isLineStart(text, lineStart) && text.startsWith('```', lineStart)) {
      return lineStart;
    }
    if (lineEnd === -1) break;
    scan = lineStart;
  }
  return -1;
}

function processFencedCodeBlock(
  content: string,
  start: number,
): { nextIndex: number; output: string } | null {
  const fenceLineEnd = content.indexOf('\n', start);
  if (fenceLineEnd === -1) {
    return { nextIndex: content.length, output: content.slice(start) };
  }

  const fenceLine = content.slice(start, fenceLineEnd + 1);
  const codeStart = fenceLineEnd + 1;
  const close = findClosingFence(content, codeStart);

  if (close === -1) {
    return {
      nextIndex: content.length,
      output: fenceLine + convertLegacyVariables(content.slice(codeStart)),
    };
  }

  const codeContent = convertLegacyVariables(content.slice(codeStart, close));
  const closeLineEnd = content.indexOf('\n', close);
  const closeLine =
    closeLineEnd === -1
      ? content.slice(close)
      : content.slice(close, closeLineEnd + 1);

  return {
    nextIndex: closeLineEnd === -1 ? content.length : closeLineEnd + 1,
    output: fenceLine + codeContent + closeLine,
  };
}

function processInlineCode(
  content: string,
  start: number,
): { nextIndex: number; output: string } | null {
  const end = content.indexOf('`', start + 1);
  if (end === -1) {
    return { nextIndex: content.length, output: content.slice(start) };
  }

  const codeContent = convertLegacyVariables(content.slice(start + 1, end));
  return { nextIndex: end + 1, output: `\`${codeContent}\`` };
}

/**
 * Replaces legacy <<variable>> syntax inside code blocks and inline code with {user.*} syntax.
 *
 * We do a manual string pass because the legacy <<var>> micromark tokenizer
 * cannot run inside code spans or fenced code blocks. That means variables in
 * code would otherwise remain literal text and never reach the Variable node
 * runtime. We normalize them to `{user.*}` here so later stages can resolve
 * them (syntax highlighter for code, variablesTextTransformer for normal text).
 */
export function replaceLegacyVariablesInCode(content: string): string {
  let i = 0;
  let out = '';

  while (i < content.length) {
    if (isLineStart(content, i) && content.startsWith('```', i)) {
      const result = processFencedCodeBlock(content, i);
      if (result) {
        out += result.output;
        i = result.nextIndex;
      } else {
        out += content[i];
        i += 1;
      }
    } else if (content[i] === '`') {
      const result = processInlineCode(content, i);
      if (result) {
        out += result.output;
        i = result.nextIndex;
      } else {
        out += content[i];
        i += 1;
      }
    } else {
      out += content[i];
      i += 1;
    }
  }

  return out;
}
