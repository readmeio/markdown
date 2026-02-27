/* eslint-disable @typescript-eslint/no-use-before-define */
import type { CompileContext, Extension as FromMarkdownExtension, Handle } from 'mdast-util-from-markdown';
import type { Code, Construct, Effects, Extension, State, TokenizeContext } from 'micromark-util-types';

import { decodeHTMLStrict } from 'entities';
import { asciiAlphanumeric } from 'micromark-util-character';
import { codes } from 'micromark-util-symbol';

declare module 'micromark-util-types' {
  interface TokenTypeMap {
    looseHtmlEntity: 'looseHtmlEntity';
  }
}

const MAX_ENTITY_LENGTH = 32;

const looseHtmlEntityConstruct: Construct = {
  name: 'looseHtmlEntity',
  tokenize: tokenizeLooseHtmlEntity,
};

function resolveEntity(name: string): string | undefined {
  const input = `&${name};`;
  const decoded = decodeHTMLStrict(input);

  return decoded !== input ? decoded : undefined;
}

function tokenizeLooseHtmlEntity(this: TokenizeContext, effects: Effects, ok: State, nok: State): State {
  let length = 0;

  const start = (code: Code): State | undefined => {
    if (code !== codes.ampersand) return nok(code);
    effects.enter('looseHtmlEntity');
    effects.consume(code);
    return accumulate;
  };

  const accumulate = (code: Code): State | undefined => {
    if (asciiAlphanumeric(code) && length < MAX_ENTITY_LENGTH) {
      effects.consume(code);
      length += 1;
      return accumulate;
    }

    if (length === 0) return nok(code);
    if (code === codes.semicolon) return nok(code);

    effects.exit('looseHtmlEntity');
    return ok(code);
  };

  return start;
}

function exitLooseHtmlEntity(this: CompileContext, token: Parameters<Handle>[0]): void {
  const raw = this.sliceSerialize(token);
  const entityChars = raw.slice(1);

  for (let len = entityChars.length; len >= 2; len -= 1) {
    const candidate = entityChars.slice(0, len);
    const decoded = resolveEntity(candidate);
    if (decoded) {
      const remainder = entityChars.slice(len);
      this.enter({ type: 'text', value: decoded + remainder }, token);
      this.exit(token);
      return;
    }
  }

  this.enter({ type: 'text', value: raw }, token);
  this.exit(token);
}

export function looseHtmlEntity(): Extension {
  return {
    text: { [codes.ampersand]: looseHtmlEntityConstruct },
  };
}

export function looseHtmlEntityFromMarkdown(): FromMarkdownExtension {
  return {
    exit: {
      looseHtmlEntity: exitLooseHtmlEntity,
    },
  };
}
