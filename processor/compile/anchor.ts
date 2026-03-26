import type { Anchor } from '../../types';
import type { Nodes } from 'mdast';

import { toMarkdown } from 'mdast-util-to-markdown';

import { formatProps, getHProps } from '../utils';

const anchor = (node: Anchor) => {
  const { href, label, target, title } = getHProps<Anchor['data']['hProperties']>(node);

  const attrs = {
    ...(label && { label }),
    ...(target && { target }),
    href: href ?? '',
    ...(title && { title }),
  };

  // Serialize children (phrasing content) back to markdown
  // Wrap in paragraph to satisfy RootContent type requirement
  const children = toMarkdown({
    type: 'paragraph',
    children: node.children,
  }).trim();

  return `<Anchor ${formatProps(attrs)}>${children}</Anchor>`;
};

export default anchor;
