import type { MDXContent } from 'mdx/types';

import { mdxish, renderMdxish } from '../../lib';
import { execute } from '../helpers';

export const renderingEngines = [
  ['mdx', (md: string) => execute(md) as MDXContent] as const,
  ['mdxish', (md: string) => renderMdxish(mdxish(md)).default as MDXContent] as const,
];
