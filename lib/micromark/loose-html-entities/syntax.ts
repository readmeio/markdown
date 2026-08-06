/* eslint-disable @typescript-eslint/no-use-before-define */
import type { CompileContext, Extension as FromMarkdownExtension, Handle } from 'mdast-util-from-markdown';
import type { Code, Construct, Effects, Extension, State, TokenizeContext } from 'micromark-util-types';

import { decodeHTML } from 'entities';
import { asciiAlphanumeric, asciiDigit, asciiHexDigit } from 'micromark-util-character';
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

function tokenizeLooseHtmlEntity(this: TokenizeContext, effects: Effects, ok: State, nok: State): State {
  let length = 0;

  const start = (code: Code): State | undefined => {
    if (code !== codes.ampersand) return nok(code);
    effects.enter('looseHtmlEntity');
    effects.consume(code);
    return afterAmpersand;
  };

  const afterAmpersand = (code: Code): State | undefined => {
    if (code === codes.numberSign) {
      effects.consume(code);
      return afterHash;
    }

    return accumulateNamed(code);
  };

  const afterHash = (code: Code): State | undefined => {
    if (code === codes.lowercaseX || code === codes.uppercaseX) {
      effects.consume(code);
      return accumulateHex;
    }

    return accumulateDecimal(code);
  };

  const accumulateNamed = (code: Code): State | undefined => {
    if (asciiAlphanumeric(code) && length < MAX_ENTITY_LENGTH) {
      effects.consume(code);
      length += 1;
      return accumulateNamed;
    }

    if (length === 0) return nok(code);
    if (code === codes.semicolon) return nok(code);

    effects.exit('looseHtmlEntity');
    return ok(code);
  };

  const accumulateDecimal = (code: Code): State | undefined => {
    if (asciiDigit(code) && length < MAX_ENTITY_LENGTH) {
      effects.consume(code);
      length += 1;
      return accumulateDecimal;
    }

    if (length === 0) return nok(code);
    if (code === codes.semicolon) return nok(code);

    effects.exit('looseHtmlEntity');
    return ok(code);
  };

  const accumulateHex = (code: Code): State | undefined => {
    if (asciiHexDigit(code) && length < MAX_ENTITY_LENGTH) {
      effects.consume(code);
      length += 1;
      return accumulateHex;
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

  // `decodeHTML` follows the HTML spec's legacy rules, where only a small
  // whitelist of names may omit the semicolon, so `&partner_key` stays intact.
  this.enter({ type: 'text', value: decodeHTML(raw) }, token);
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
