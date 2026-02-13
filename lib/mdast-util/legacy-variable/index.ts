import type { CompileContext, Extension as FromMarkdownExtension, Handle, Token } from 'mdast-util-from-markdown';
import type { Variable } from 'types';

import { NodeTypes } from '../../../enums';

// MDAST bridge for legacy <<variable>> tokens. It consumes micromark tokens
// from lib/micromark/legacy-variable and produces Variable/Glossary nodes.

// Per-token state to accumulate the raw <<...>> value across token handlers.
// It will build up the full variable name between the << and >> markers as
// each character is emitted by the micromark tokenizer.
interface Context {
  value: string;
}

const contextMap = new WeakMap<Token, Context>();

function findlegacyVariableToken(this: CompileContext): Token | undefined {
  // tokenStack is micromark's current open token ancestry; find the nearest legacyVariable token.
  const events = this.tokenStack;
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const token = events[i][0];
    if (token.type === 'legacyVariable') return token;
  }
  return undefined;
}

function enterlegacyVariable(this: CompileContext, token: Parameters<Handle>[0]): void {
  contextMap.set(token, { value: '' });
}

function exitlegacyVariableValue(this: CompileContext, token: Parameters<Handle>[0]): void {
  const variableToken = findlegacyVariableToken.call(this);
  if (!variableToken) return;

  const ctx = contextMap.get(variableToken);
  // Build up the variable characters
  if (ctx) ctx.value += this.sliceSerialize(token);
}

function exitlegacyVariable(this: CompileContext, token: Parameters<Handle>[0]): void {
  const ctx = contextMap.get(token);
  const serialized = this.sliceSerialize(token);
  const variableName =
    serialized.startsWith('<<') && serialized.endsWith('>>')
      ? serialized.slice(2, -2)
      : ctx?.value ?? '';

  this.enter(
    {
      type: NodeTypes.variable,
      data: {
        hName: 'Variable',
        hProperties: { name: variableName.trim() },
      },
      value: `<<${variableName}>>`,
    } as Variable,
    token,
  );

  this.exit(token);
  contextMap.delete(token);
}

export function legacyVariableFromMarkdown(): FromMarkdownExtension {
  return {
    enter: {
      legacyVariable: enterlegacyVariable,
    },
    exit: {
      legacyVariableValue: exitlegacyVariableValue,
      legacyVariable: exitlegacyVariable,
    },
  };
}
