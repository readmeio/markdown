import type { Anchor } from '../../types';
import type { Parents } from 'mdast';
import type { Handle, Info, State } from 'mdast-util-to-markdown';

import { formatProps, getHProps } from '../utils';

const anchor = ((node: Anchor, _parent: Parents | undefined, state: State, info: Info) => {
  const { href, label, target, title } = getHProps<Anchor['data']['hProperties']>(node);

  const attrs = {
    ...(label && { label }),
    ...(target && { target }),
    href: href ?? '',
    ...(title && { title }),
  };

  const openingTag = `<Anchor ${formatProps(attrs)}>`;

  // Serialize the label through the caller's state so readme nodes (variables,
  // emoji, glossary) reach their handlers instead of throwing as unknown.
  const tracker = state.createTracker(info);
  tracker.move(openingTag);
  const children = tracker.move(state.containerPhrasing(node, { after: '<', before: '>', ...tracker.current() }));
  tracker.move('</Anchor>');

  return `${openingTag}${children}</Anchor>`;
}) satisfies Handle;

export default anchor;
