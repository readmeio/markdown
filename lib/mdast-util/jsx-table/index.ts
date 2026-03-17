import type { CompileContext, Extension as FromMarkdownExtension, Handle, Token } from 'mdast-util-from-markdown';
import type { HTML } from 'mdast';

const contextMap = new WeakMap<Token, { chunks: string[] }>();

function findJsxTableToken(this: CompileContext): Token | undefined {
  const events = this.tokenStack;
  for (let i = events.length - 1; i >= 0; i -= 1) {
    if (events[i][0].type === 'jsxTable') return events[i][0];
  }
  return undefined;
}

function enterJsxTable(this: CompileContext, token: Parameters<Handle>[0]): void {
  contextMap.set(token, { chunks: [] });
  this.enter({ type: 'html', value: '' } as HTML, token);
}

function exitJsxTableData(this: CompileContext, token: Parameters<Handle>[0]): void {
  const tableToken = findJsxTableToken.call(this);
  if (!tableToken) return;
  const ctx = contextMap.get(tableToken);
  if (ctx) ctx.chunks.push(this.sliceSerialize(token));
}

function exitJsxTable(this: CompileContext, token: Parameters<Handle>[0]): void {
  const ctx = contextMap.get(token);
  const node = this.stack[this.stack.length - 1] as HTML;
  if (ctx) {
    node.value = ctx.chunks.join('\n');
    contextMap.delete(token);
  }
  this.exit(token);
}

export function jsxTableFromMarkdown(): FromMarkdownExtension {
  return {
    enter: {
      jsxTable: enterJsxTable,
    },
    exit: {
      jsxTableData: exitJsxTableData,
      jsxTable: exitJsxTable,
    },
  };
}
