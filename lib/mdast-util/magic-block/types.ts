/**
 * TypeScript types for magic block MDAST nodes.
 */
import type { Literal } from 'mdast';

/**
 * Magic block node in the MDAST tree.
 * Created by the fromMarkdown extension from micromark tokens.
 */
export interface MagicBlockNode extends Literal {
  /**
   * The block type identifier (e.g., "image", "callout", "code")
   */
  blockType: string;
  type: 'magicBlock';
  /**
   * The raw string value of the magic block.
   */
  value: string;
}

/**
 * Extend MDAST types to include our custom magicBlock node.
 */
declare module 'mdast' {
  interface RootContentMap {
    magicBlock: MagicBlockNode;
  }
  interface PhrasingContentMap {
    magicBlock: MagicBlockNode;
  }
}
