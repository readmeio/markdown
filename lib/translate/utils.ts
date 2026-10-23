import type { MdastNode, MagicBlockImage } from '../../processor/transform/mdxish/magic-blocks/types';
import type { Root as MdastRoot } from 'mdast';

export type BlockTranslator = (raw: string) => string;

export interface MagicBlockFigure extends MdastNode {
  children: MdastNode[];
  type: 'figure';
}

export type MagicBlockImageNode = MagicBlockImage & MdastNode;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isMdastNode(value: unknown): value is MdastNode {
  return isRecord(value) && typeof value.type === 'string';
}

export function isMdastRoot(value: unknown): value is MdastRoot {
  return isRecord(value) && value.type === 'root' && Array.isArray(value.children);
}

export function getChildren(value: MdastNode | MdastRoot) {
  return Array.isArray(value.children) ? value.children.filter(isMdastNode) : [];
}
