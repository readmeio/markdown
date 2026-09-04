/* eslint-disable @typescript-eslint/no-use-before-define */
import type {
  Code,
  Construct,
  ConstructRecord,
  Effects,
  Extension,
  State,
  TokenizeContext,
} from 'micromark-util-types';

import { factorySpace } from 'micromark-factory-space';
import { markdownLineEnding, markdownSpace } from 'micromark-util-character';
import { codes, constants, types } from 'micromark-util-symbol';

type Variant = 'mdxFlowExpression' | 'mdxTextExpression';

/**
 * The flow constructs allowed to end a multiline run, per parser. Everything but `<`: a
 * `<Component>` on its own line is the very shape the flow construct exists to keep together.
 */
const interrupters = new WeakMap<ConstructRecord, ConstructRecord>();

const flowInterrupters = (flow: ConstructRecord): ConstructRecord => {
  let record = interrupters.get(flow);
  if (!record) {
    record = Object.fromEntries(Object.entries(flow).filter(([code]) => Number(code) !== codes.lessThan));
    interrupters.set(flow, record);
  }
  return record;
};

/**
 * Lookahead run at every line ending of a flow run, mirroring the paragraph continuation check
 * in `micromark-core-commonmark/lib/content.js`: `ok` when the next line continues the run,
 * `nok` when it is blank (including whitespace-only) or would start a fenced code block,
 * heading, or thematic break — which the run must then leave alone rather than swallow.
 */
function tokenizeLineContinues(this: TokenizeContext, effects: Effects, ok: State, nok: State): State {
  // eslint-disable-next-line @typescript-eslint/no-this-alias
  const self = this;

  return start;

  function start(code: Code): State | undefined {
    effects.enter(types.lineEnding);
    effects.consume(code);
    effects.exit(types.lineEnding);
    return factorySpace(effects, prefixed, types.linePrefix);
  }

  function prefixed(code: Code): State | undefined {
    if (code === codes.eof || markdownLineEnding(code)) return nok(code);

    // Indented code can't interrupt, so neither can anything else on an indented line.
    const tail = self.events[self.events.length - 1];
    if (
      self.parser.constructs.disable?.null?.includes('codeIndented') !== true &&
      tail &&
      tail[1].type === types.linePrefix &&
      tail[2].sliceSerialize(tail[1], true).length >= constants.tabSize
    ) {
      return ok(code);
    }

    return effects.interrupt(flowInterrupters(self.parser.constructs.flow), nok, ok)(code);
  }
}

const lineContinues: Construct = { tokenize: tokenizeLineContinues, partial: true };

/**
 * Lenient MDX expression tokenizer (agnostic / no acorn).
 *
 * Matches a balanced `{ ... }` run — tracking nested braces and spanning soft
 * line breaks — and emits the standard `mdx*Expression*` tokens so the
 * upstream `mdxExpressionFromMarkdown()` builds the node.
 *
 * Reimplements the official micromark mdxExpression, but an unbalanced brace that
 * reaches end of input returns `nok` instead of throwing: micromark rolls back
 * and the `{` renders as literal text, making the pipeline forgiving of stray
 * braces that upstream would hard-error on.
 */
function tokenizeExpression(variant: Variant) {
  const isFlow = variant === 'mdxFlowExpression';

  return function tokenize(this: TokenizeContext, effects: Effects, ok: State, nok: State): State {
    // Read eagerly: micromark calls `tokenize` with a fresh context per attempt, so this is the
    // value for this attempt, and the state functions below don't receive `this` at all.
    const { interrupt } = this;
    let depth = 0;
    let multiline = false;

    return start;

    function start(code: Code): State | undefined {
      if (code !== codes.leftCurlyBrace) return nok(code);
      // Never end a paragraph. A `{` continuing the line above is prose or a magic-block body
      // (`[block:callout]` puts one on the next line), not a block of its own.
      if (isFlow && interrupt) return nok(code);

      effects.enter(variant);
      effects.enter(`${variant}Marker`);
      effects.consume(code);
      effects.exit(`${variant}Marker`);
      return before;
    }

    function before(code: Code): State | undefined {
      if (code === codes.eof) return end(code);

      if (markdownLineEnding(code)) {
        // A text run lives in a paragraph micromark has already bounded. A flow run bounds
        // itself: a blank line or an interrupting block ends it, so a stray `{` can't claim
        // the rest of the document, and `{\n\n}` stays two literal paragraphs.
        return isFlow ? effects.check(lineContinues, lineEnding, end)(code) : lineEnding(code);
      }

      if (code === codes.rightCurlyBrace && depth === 0) return close(code);

      effects.enter(`${variant}Chunk`);
      return inside(code);
    }

    function lineEnding(code: Code): State | undefined {
      multiline = true;
      effects.enter(types.lineEnding);
      effects.consume(code);
      effects.exit(types.lineEnding);
      return before;
    }

    function end(code: Code): State | undefined {
      effects.exit(variant);
      return nok(code);
    }

    function inside(code: Code): State | undefined {
      if (code === codes.eof || markdownLineEnding(code)) {
        effects.exit(`${variant}Chunk`);
        return before(code);
      }

      if (code === codes.rightCurlyBrace && depth === 0) {
        effects.exit(`${variant}Chunk`);
        return close(code);
      }

      if (code === codes.leftCurlyBrace) depth += 1;
      else if (code === codes.rightCurlyBrace) depth -= 1;

      effects.consume(code);
      return inside;
    }

    function close(code: Code): State | undefined {
      effects.enter(`${variant}Marker`);
      effects.consume(code);
      effects.exit(`${variant}Marker`);
      effects.exit(variant);

      if (!isFlow) return ok;
      // A run that closes on the line it opened stays a text expression inside its paragraph:
      // claiming it as flow would strip the `<p>` every standalone `{expr}` line renders with.
      return multiline ? after : nok;
    }

    function after(code: Code): State | undefined {
      return markdownSpace(code) ? factorySpace(effects, lineEnd, types.whitespace)(code) : lineEnd(code);
    }

    function lineEnd(code: Code): State | undefined {
      return code === codes.eof || markdownLineEnding(code) ? ok(code) : nok(code);
    }
  };
}

export function mdxExpressionLenient(): Extension {
  return {
    flow: {
      [codes.leftCurlyBrace]: {
        name: 'mdxFlowExpression',
        tokenize: tokenizeExpression('mdxFlowExpression'),
        concrete: true,
      },
    },
    text: {
      [codes.leftCurlyBrace]: {
        name: 'mdxTextExpression',
        tokenize: tokenizeExpression('mdxTextExpression'),
      },
    },
  };
}
