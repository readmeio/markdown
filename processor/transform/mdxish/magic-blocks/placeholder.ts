import type { MdastNode } from './types';

export interface MagicBlockTransformerOptions {
  compatibilityMode?: boolean;
  safeMode?: boolean;
}

export const EMPTY_IMAGE_PLACEHOLDER = {
  type: 'image-block',
  data: { hName: 'img', hProperties: { src: '', alt: '' } },
} satisfies MdastNode;

export const EMPTY_EMBED_PLACEHOLDER = {
  type: 'embed-block',
  data: { hName: 'embed', hProperties: { url: '' } },
} satisfies MdastNode;

export const EMPTY_RECIPE_PLACEHOLDER = {
  type: 'recipe',
  data: { hName: 'Recipe', hProperties: { slug: '', title: '' } },
} satisfies MdastNode;

export const EMPTY_CALLOUT_PLACEHOLDER = {
  type: 'rdme-callout',
  data: { hName: 'Callout', hProperties: { icon: '📘', theme: 'info' } },
  children: [],
} satisfies MdastNode;

export const EMPTY_TABLE_PLACEHOLDER = {
  type: 'table',
  align: ['left', 'left'],
  children: [
    { type: 'tableRow', children: [{ type: 'tableCell', children: [{ type: 'text', value: '' }] }] },
    { type: 'tableRow', children: [{ type: 'tableCell', children: [{ type: 'text', value: '' }] }] },
  ],
} satisfies MdastNode;

export const EMPTY_CODE_PLACEHOLDER = {
  type: 'code',
  value: '',
  lang: null,
  meta: null,
} satisfies MdastNode;
