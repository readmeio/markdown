/* eslint-disable @typescript-eslint/no-use-before-define */
import type { CompileContext, Extension as FromMarkdownExtension, Handle } from 'mdast-util-from-markdown';
import type { Code, Construct, Effects, Extension, State, TokenizeContext } from 'micromark-util-types';

import { codes } from 'micromark-util-symbol';

declare module 'micromark-util-types' {
  interface TokenTypeMap {
    nbsp: 'nbsp';
  }
}

const nbspConstruct: Construct = {
  name: 'nbsp',
  tokenize,
};

function tokenize(this: TokenizeContext, effects: Effects, ok: State, nok: State): State {
  const start = (code: Code): State | undefined => {
    if (code !== codes.ampersand) return nok(code);
    effects.enter('nbsp');
    effects.consume(code); // &
    return expectN;
  };

  const expectN = (code: Code): State | undefined => {
    if (code !== 110) return nok(code); // 'n'
    effects.consume(code);
    return expectB;
  };

  const expectB = (code: Code): State | undefined => {
    if (code !== 98) return nok(code); // 'b'
    effects.consume(code);
    return expectS;
  };

  const expectS = (code: Code): State | undefined => {
    if (code !== 115) return nok(code); // 's'
    effects.consume(code);
    return expectP;
  };

  const expectP = (code: Code): State | undefined => {
    if (code !== 112) return nok(code); // 'p'
    effects.consume(code);
    return checkSemicolon;
  };

  const checkSemicolon = (code: Code): State | undefined => {
    if (code === codes.semicolon) return nok(code);
    effects.exit('nbsp');
    return ok(code);
  };

  return start;
}

export function nbsp(): Extension {
  return {
    text: { [codes.ampersand]: nbspConstruct },
  };
}

function exitNbsp(this: CompileContext, token: Parameters<Handle>[0]): void {
  this.enter({ type: 'text', value: '\u00a0' }, token);
  this.exit(token);
}

export function nbspFromMarkdown(): FromMarkdownExtension {
  return {
    exit: {
      nbsp: exitNbsp,
    },
  };
}
