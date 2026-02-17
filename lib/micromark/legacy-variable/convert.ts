import { markdownLineEnding } from 'micromark-util-character';

function isAllowedValueChar(char: string): boolean {
  return char !== '<' && char !== '>' && !markdownLineEnding(char.charCodeAt(0));
}

function isValidUserIdentifier(identifier: string): boolean {
  return /^(\p{Letter}|[$_])(\p{Letter}|[$_0-9])*$/u.test(identifier);
}

function toUserExpression(variableName: string): string {
  const normalized = variableName.trim();

  if (normalized.startsWith('glossary:')) {
    return normalized.toUpperCase();
  }

  if (isValidUserIdentifier(normalized)) {
    return `{user.${normalized}}`;
  }

  return `{user[${JSON.stringify(normalized)}]}`;
}

/**
 * Converts legacy <<variable>> tokens in plain strings into canonical user-variable expressions.
 *
 * This is intentionally string-based so it can be used by code/inlineCode nodes, where mdast does not
 * support mixed phrasing children (such as Variable nodes).
 */
export function convertLegacyVariables(input: string): string {
  let index = 0;
  let output = '';

  while (index < input.length) {
    const current = input[index];
    const next = input[index + 1];

    // Support escaped opening marker: \<<name>> -> <<name>>
    if (current === '\\' && next === '<' && input[index + 2] === '<') {
      output += '<<';
      index += 3;
      continue;
    }

    // Support escaped closing marker: \>> -> >>
    if (current === '\\' && next === '>' && input[index + 2] === '>') {
      output += '>>';
      index += 3;
      continue;
    }

    if (current === '<' && next === '<') {
      let scan = index + 2;
      let value = '';
      let valid = true;

      while (scan < input.length) {
        const scanChar = input[scan];
        const scanNext = input[scan + 1];

        if (scanChar === '>' && scanNext === '>') break;

        if (!isAllowedValueChar(scanChar)) {
          valid = false;
          break;
        }

        value += scanChar;
        scan += 1;
      }

      const hasClosing = scan < input.length && input[scan] === '>' && input[scan + 1] === '>';
      const hasValue = value.length > 0;

      if (valid && hasClosing && hasValue) {
        output += toUserExpression(value);
        index = scan + 2;
        continue;
      }
    }

    output += current;
    index += 1;
  }

  return output;
}
