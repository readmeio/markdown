import type { CompileContext, Extension as FromMarkdownExtension, Handle, Token } from 'mdast-util-from-markdown';
import type { MdxJsxTextElement } from 'mdast-util-mdx-jsx';
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

function createGlossaryNode(value: string, token: Parameters<Handle>[0]): MdxJsxTextElement {
  const term = value.slice('glossary:'.length).trim();
  const glossaryPrependLength = '<<glossary:'.length;
  const closingArrowLength = '>>'.length;
  return {
    type: 'mdxJsxTextElement',
    name: 'Glossary',
    attributes: [],
    children: [{
      type: 'text',
      value: term,
      position: {
        start: {
          offset: token.start.offset + glossaryPrependLength,
          line: token.start.line,
          column: token.start.column + glossaryPrependLength,
        },
        end: {
          offset: token.end.offset - closingArrowLength,
          line: token.end.line,
          column: token.end.column - closingArrowLength,
        },
      },
    }],
    position: {
      start: {
        offset: token.start.offset,
        line: token.start.line,
        column: token.start.column,
      },
      end: {
        offset: token.end.offset,
        line: token.end.line,
        column: token.end.column,
      },
    },
  };
}

function exitlegacyVariable(this: CompileContext, token: Parameters<Handle>[0]): void {
  const ctx = contextMap.get(token);
  const serialized = this.sliceSerialize(token);
  const rawValue =
    serialized.startsWith('<<') && serialized.endsWith('>>')
      ? serialized.slice(2, -2)
      : ctx?.value ?? '';
  const trimmed = rawValue.trim();

  if (trimmed.startsWith('glossary:')) {
    // Since there isn't a Node type for Glossary anymore, we just parse it as an mdxJsxTextElement
    // and let the pipeline later convert it to a component
    // It's not truly an mdx text element, but we can treat it as such for now
    const glossaryNode = createGlossaryNode(rawValue, token);
    this.enter(glossaryNode, token);
  } else {
    this.enter(
      {
        type: NodeTypes.variable,
        data: {
          hName: 'Variable',
          hProperties: { name: trimmed },
        },
        value: `<<${rawValue}>>`,
      } as Variable,
      token,
    );
  }

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
