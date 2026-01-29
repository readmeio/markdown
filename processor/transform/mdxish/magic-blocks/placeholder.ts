import type { MdastNode } from './types';

export const EMPTY_IMAGE_PLACEHOLDER = {
  type: 'image',
  url: '',
  alt: '',
  title: '',
  data: { hProperties: {} },
} satisfies MdastNode;

export const EMPTY_EMBED_PLACEHOLDER = {
  type: 'embed',
  children: [{ type: 'link', url: '', title: '', children: [{ type: 'text', value: '' }] }],
  data: { hName: 'embed-block', hProperties: { url: '', href: '', title: '' } },
} satisfies MdastNode;

export const EMPTY_RECIPE_PLACEHOLDER = {
  type: 'mdxJsxFlowElement',
  name: 'Recipe',
  attributes: [],
  children: [],
} satisfies MdastNode;

export const EMPTY_CALLOUT_PLACEHOLDER = {
  type: 'mdxJsxFlowElement',
  name: 'Callout',
  attributes: [
    { type: 'mdxJsxAttribute', name: 'icon', value: '📘' },
    { type: 'mdxJsxAttribute', name: 'theme', value: 'info' },
    { type: 'mdxJsxAttribute', name: 'type', value: 'info' },
    { type: 'mdxJsxAttribute', name: 'empty', value: 'true' },
  ],
  children: [{ type: 'heading', depth: 3, children: [{ type: 'text', value: '' }] }],
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
