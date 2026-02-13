import type { CompileContext, Extension as FromMarkdownExtension, Handle, Token } from 'mdast-util-from-markdown';
import type { Variable } from 'types';

import { NodeTypes } from '../../../enums';

interface Context {
  value: string;
}

const contextMap = new WeakMap<Token, Context>();

function findlegacyVariableToken(this: CompileContext): Token | undefined {
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
  const readmeToken = findlegacyVariableToken.call(this);
  if (!readmeToken) return;

  const ctx = contextMap.get(readmeToken);
  if (ctx) ctx.value += this.sliceSerialize(token);
}

function exitlegacyVariable(this: CompileContext, token: Parameters<Handle>[0]): void {
  const ctx = contextMap.get(token);
  const serialized = this.sliceSerialize(token);
  const raw =
    serialized.startsWith('<<') && serialized.endsWith('>>')
      ? serialized.slice(2, -2)
      : ctx?.value ?? '';
  const trimmed = raw.trim();

  this.enter(
    {
      type: NodeTypes.variable,
      data: {
        hName: 'Variable',
        hProperties: { name: trimmed },
      },
      value: `<<${raw}>>`,
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
