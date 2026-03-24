/**
 * MDAST utility for magic block syntax.
 *
 * Provides fromMarkdown and toMarkdown extensions for converting
 * micromark tokens to/from MDAST nodes.
 */
import type { MagicBlockNode } from './types';
import type { CompileContext, Extension as FromMarkdownExtension, Handle, Token } from 'mdast-util-from-markdown';
import type { Options as ToMarkdownExtension, Handle as ToMarkdownHandle } from 'mdast-util-to-markdown';

export type { MagicBlockNode } from './types';

// Context storage for accumulating data across token handlers
interface MagicBlockContext {
  blockType: string;
  dataChunks: string[];
}

const contextMap = new WeakMap<Token, MagicBlockContext>();

/**
 * Find the magicBlock token in the token ancestry.
 */
function findMagicBlockToken(this: CompileContext): Token | undefined {
  // Walk up the token stack to find the magicBlock token
  const events = this.tokenStack;
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const token = events[i][0];
    if (token.type === 'magicBlock') {
      return token;
    }
  }
  return undefined;
}

/**
 * Enter handler: Create a new magicBlock node.
 */
function enterMagicBlock(this: CompileContext, token: Parameters<Handle>[0]): void {
  // Initialize context for this magic block
  contextMap.set(token, { blockType: '', dataChunks: [] });

  this.enter(
    {
      type: 'magicBlock',
      blockType: '',
      data: {},
      value: '',
    } as MagicBlockNode,
    token,
  );
}

/**
 * Exit handler for block type: Extract the block type from the token.
 */
function exitMagicBlockType(this: CompileContext, token: Parameters<Handle>[0]): void {
  const blockToken = findMagicBlockToken.call(this);
  if (!blockToken) return;

  const context = contextMap.get(blockToken);
  if (context) {
    context.blockType = this.sliceSerialize(token);
  }
}

/**
 * Exit handler for block data: Accumulate JSON content chunks.
 */
function exitMagicBlockData(this: CompileContext, token: Parameters<Handle>[0]): void {
  const blockToken = findMagicBlockToken.call(this);
  if (!blockToken) return;

  const context = contextMap.get(blockToken);
  if (context) {
    context.dataChunks.push(this.sliceSerialize(token));
  }
}

/**
 * Exit handler for line endings: Preserve newlines in multiline blocks.
 */
function exitMagicBlockLineEnding(this: CompileContext, token: Parameters<Handle>[0]): void {
  const blockToken = findMagicBlockToken.call(this);
  if (!blockToken) return;

  const context = contextMap.get(blockToken);
  if (context) {
    context.dataChunks.push(this.sliceSerialize(token));
  }
}

/**
 * Exit handler for end marker: If this is a failed end marker check (not the final marker),
 * add its content to the data chunks so we don't lose characters like '['.
 */
function exitMagicBlockMarkerEnd(this: CompileContext, token: Parameters<Handle>[0]): void {
  const blockToken = findMagicBlockToken.call(this);
  if (!blockToken) return;

  // Get the content of the marker
  const markerContent = this.sliceSerialize(token);

  // If this marker doesn't end with ']', it's a failed check and content belongs to data
  // The successful end marker would be "[/block]"
  if (!markerContent.endsWith(']') || markerContent !== '[/block]') {
    const context = contextMap.get(blockToken);
    if (context) {
      context.dataChunks.push(markerContent);
    }
  }
}

/**
 * Exit handler: Finalize the magicBlock node with parsed JSON data.
 */
function exitMagicBlock(this: CompileContext, token: Parameters<Handle>[0]): void {
  const context = contextMap.get(token);
  const node = this.stack[this.stack.length - 1] as MagicBlockNode;

  if (context) {
    const rawJson = context.dataChunks.join('');
    node.blockType = context.blockType;
    node.value = `[block:${context.blockType}]${rawJson}[/block]`;

    // Parse JSON data
    try {
      node.data = JSON.parse(rawJson.trim());
    } catch {
      // Invalid JSON - store empty object but keep the raw value
      node.data = {};
    }

    // Clean up context
    contextMap.delete(token);
  }

  this.exit(token);
}

/**
 * Handler to serialize magicBlock nodes back to markdown.
 */
const handleMagicBlock: ToMarkdownHandle = (node): string => {
  const magicNode = node as MagicBlockNode;
  // If we have the original raw value, use it
  if (magicNode.value) {
    return magicNode.value;
  }
  // Otherwise reconstruct from parsed data
  const json = JSON.stringify(magicNode.data, null, 2);
  return `[block:${magicNode.blockType}]\n${json}\n[/block]`;
};

/**
 * Create an extension for `mdast-util-from-markdown` to enable magic blocks.
 *
 * Converts micromark magic block tokens into `magicBlock` MDAST nodes.
 *
 * @returns Extension for `mdast-util-from-markdown`
 */
export function magicBlockFromMarkdown(): FromMarkdownExtension {
  return {
    enter: {
      magicBlock: enterMagicBlock,
    },
    exit: {
      magicBlockType: exitMagicBlockType,
      magicBlockData: exitMagicBlockData,
      magicBlockLineEnding: exitMagicBlockLineEnding,
      magicBlockMarkerEnd: exitMagicBlockMarkerEnd,
      magicBlock: exitMagicBlock,
    },
  };
}

/**
 * Create an extension for `mdast-util-to-markdown` to serialize magic blocks.
 *
 * Converts `magicBlock` MDAST nodes back to `[block:TYPE]JSON[/block]` syntax.
 *
 * @returns Extension for `mdast-util-to-markdown`
 */
export function magicBlockToMarkdown(): ToMarkdownExtension {
  return {
    handlers: {
      magicBlock: handleMagicBlock,
    },
  };
}
