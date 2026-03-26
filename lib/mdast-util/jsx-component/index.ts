import type { HTML } from 'mdast';
import type { CompileContext, Extension as FromMarkdownExtension, Handle, Token } from 'mdast-util-from-markdown';

const contextMap = new WeakMap<Token, { chunks: string[] }>();

function findBlockToken(this: CompileContext): Token | undefined {
  const events = this.tokenStack;
  for (let i = events.length - 1; i >= 0; i -= 1) {
    if (events[i][0].type === 'jsxComponentBlock') return events[i][0];
  }
  return undefined;
}

function enterBlock(this: CompileContext, token: Parameters<Handle>[0]): void {
  contextMap.set(token, { chunks: [] });
  this.enter({ type: 'html', value: '' } as HTML, token);
}

function exitBlockData(this: CompileContext, token: Parameters<Handle>[0]): void {
  const blockToken = findBlockToken.call(this);
  if (!blockToken) return;
  const ctx = contextMap.get(blockToken);
  if (ctx) ctx.chunks.push(this.sliceSerialize(token));
}

function exitBlock(this: CompileContext, token: Parameters<Handle>[0]): void {
  const ctx = contextMap.get(token);
  const node = this.stack[this.stack.length - 1] as HTML;
  if (ctx) {
    node.value = ctx.chunks.join('\n');
    contextMap.delete(token);
  }
  this.exit(token);
}

function enterText(this: CompileContext, token: Parameters<Handle>[0]): void {
  this.enter({ type: 'html', value: '' } as HTML, token);
}

function exitText(this: CompileContext, token: Parameters<Handle>[0]): void {
  const node = this.stack[this.stack.length - 1] as HTML;
  node.value = this.sliceSerialize(token);
  this.exit(token);
}

export function jsxComponentBlockFromMarkdown(): FromMarkdownExtension {
  return {
    enter: {
      jsxComponentBlock: enterBlock,
      jsxComponentText: enterText,
    },
    exit: {
      jsxComponentBlockData: exitBlockData,
      jsxComponentBlock: exitBlock,
      jsxComponentText: exitText,
    },
  };
}
