import type { Depth } from '../../components/Heading';
import type { UseMdxComponents } from '@mdx-js/mdx';
import type { MDXComponents } from 'mdx/types';

import Variable from '@readme/variable';

import * as Components from '../../components';

const makeUseMDXComponents = (more: ReturnType<UseMdxComponents> = {}): UseMdxComponents => {
  const headings = Array.from({ length: 6 }).reduce((map, _, index) => {
    map[`h${index + 1}`] = Components.Heading((index + 1) as Depth);
    return map;
  }, {}) as MDXComponents;

  const components = {
    ...Components,
    Variable,
    code: Components.Code,
    embed: Components.Embed,
    img: Components.Image,
    table: Components.Table,
    'code-tabs': Components.CodeTabs,
    'embed-block': Components.Embed,
    'html-block': Components.HTMLBlock,
    'image-block': Components.Image,
    'table-of-contents': Components.TableOfContents,
    ...headings,
    ...more,
  };

  return (() => components) as unknown as UseMdxComponents;
};

export default makeUseMDXComponents;
