import type { Text } from 'mdast';
import type { CompileContext, Extension as FromMarkdownExtension, Handle, Token } from 'mdast-util-from-markdown';
import type { Variable } from 'types';

import { NodeTypes } from '../../../enums';

interface Context {
  value: string;
}

const contextMap = new WeakMap<Token, Context>();

function findReadmeVariableToken(this: CompileContext): Token | undefined {
  const events = this.tokenStack;
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const token = events[i][0];
    if (token.type === 'readmeVariable') return token;
  }
  return undefined;
}

function enterReadmeVariable(this: CompileContext, token: Parameters<Handle>[0]): void {
  contextMap.set(token, { value: '' });
}

function exitReadmeVariableValue(this: CompileContext, token: Parameters<Handle>[0]): void {
  const readmeToken = findReadmeVariableToken.call(this);
  if (!readmeToken) return;

  const ctx = contextMap.get(readmeToken);
  if (ctx) ctx.value += this.sliceSerialize(token);
}

function exitReadmeVariable(this: CompileContext, token: Parameters<Handle>[0]): void {
  const ctx = contextMap.get(token);
  const serialized = this.sliceSerialize(token);
  const raw =
    serialized.startsWith('<<') && serialized.endsWith('>>')
      ? serialized.slice(2, -2)
      : ctx?.value ?? '';
  const trimmed = raw.trim();

  if (trimmed.startsWith('glossary:')) {
    const term = trimmed.slice('glossary:'.length).trim();

    this.enter(
      {
        type: NodeTypes.glossary,
        data: {
          hName: 'Glossary',
          hProperties: { term },
        },
        children: [{ type: 'text', value: term } as Text],
      },
      token,
    );
    this.exit(token);
    contextMap.delete(token);
    return;
  }

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

export function variableFromMarkdown(): FromMarkdownExtension {
  return {
    enter: {
      readmeVariable: enterReadmeVariable,
    },
    exit: {
      readmeVariableValue: exitReadmeVariableValue,
      readmeVariable: exitReadmeVariable,
    },
  };
}
