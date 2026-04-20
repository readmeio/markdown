import type { Html } from 'mdast';
import type { CompileContext, Extension as FromMarkdownExtension, Handle, Token } from 'mdast-util-from-markdown';

const contextMap = new WeakMap<Token, { chunks: string[]; lastEndLine: number }>();

function findHtmlBlockComponentToken(this: CompileContext): Token | undefined {
  const events = this.tokenStack;
  for (let i = events.length - 1; i >= 0; i -= 1) {
    if (events[i][0].type === 'htmlBlockComponent') return events[i][0];
  }
  return undefined;
}

// Produces an MDAST `html` node, mdxishHtmlBlocks then transforms it into an `html-block` node
function enterHtmlBlockComponent(this: CompileContext, token: Parameters<Handle>[0]): void {
  contextMap.set(token, { chunks: [], lastEndLine: token.start.line });
  this.enter({ type: 'html', value: '' } as Html, token);
}

function exitHtmlBlockComponentData(this: CompileContext, token: Parameters<Handle>[0]): void {
  const componentToken = findHtmlBlockComponentToken.call(this);
  if (!componentToken) return;
  const ctx = contextMap.get(componentToken);
  if (ctx) {
    const gap = token.start.line - ctx.lastEndLine;
    if (ctx.chunks.length > 0 && gap > 0) {
      ctx.chunks.push('\n'.repeat(gap));
    }
    ctx.chunks.push(this.sliceSerialize(token));
    ctx.lastEndLine = token.end.line;
  }
}

function exitHtmlBlockComponent(this: CompileContext, token: Parameters<Handle>[0]): void {
  const ctx = contextMap.get(token);
  const node = this.stack[this.stack.length - 1] as Html;
  if (ctx) {
    node.value = ctx.chunks.join('');
    contextMap.delete(token);
  }
  this.exit(token);
}

export function htmlBlockComponentFromMarkdown(): FromMarkdownExtension {
  return {
    enter: {
      htmlBlockComponent: enterHtmlBlockComponent,
    },
    exit: {
      htmlBlockComponentData: exitHtmlBlockComponentData,
      htmlBlockComponent: exitHtmlBlockComponent,
    },
  };
}
