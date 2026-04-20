import type { RootContent } from 'mdast';
import type { Position } from 'unist';

/**
 * Intermediate figure node before conversion to the final Figure type.
 * Produced by magicBlockTransformer (for magic block images with captions)
 * and by reassembleHtmlFigures (for raw HTML <figure> elements).
 */
export interface FigureNode {
  children: RootContent[];
  data?: {
    hName?: string;
  };
  position?: Position;
  type: 'figure';
}
