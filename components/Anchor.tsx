import React, { useContext } from 'react';

import BaseUrlContext from '../contexts/BaseUrl';

// Nabbed from here:
// https://github.com/readmeio/api-explorer/blob/0dedafcf71102feedaa4145040d3f57d79d95752/packages/api-explorer/src/lib/markdown/renderer.js#L52
export function getHref(href: string, baseUrl: string) {
  const [path, hash] = href.split('#');
  const hashStr = hash ? `#${hash}` : '';

  const base = baseUrl === '/' ? '' : baseUrl;
  const doc = path.match(/^doc:([-_a-zA-Z0-9#]*)$/);

  if (doc) {
    return `${base}/docs/${doc[1]}${hashStr}`;
  }

  const ref = path.match(/^ref:([-_a-zA-Z0-9#]*)$/);
  if (ref) {
    return `${base}/reference-link/${ref[1]}${hashStr}`;
  }

  // we need to perform two matches for changelogs in case
  // of legacy links that use 'blog' instead of 'changelog'
  const blog = path.match(/^blog:([-_a-zA-Z0-9#]*)$/);
  const changelog = path.match(/^changelog:([-_a-zA-Z0-9#]*)$/);
  const changelogMatch = blog || changelog;
  if (changelogMatch) {
    return `${base}/changelog/${changelogMatch[1]}${hashStr}`;
  }

  const custompage = path.match(/^page:([-_a-zA-Z0-9#]*)$/);
  if (custompage) {
    return `${base}/page/${custompage[1]}${hashStr}`;
  }

  return href;
}

function docLink(href: string) {
  const doc = href.match(/^doc:([-_a-zA-Z0-9#]*)$/);
  if (!doc) return false;

  return {
    className: 'doc-link',
    'data-sidebar': doc[1],
  };
}

interface Props {
  children: React.ReactNode;
  download?: string;
  href?: string;
  target?: string;
  title?: string;
}

function Anchor(props: Props) {
  const { children, href = '', target = '', title = '', ...attrs } = props;
  const baseUrl: string = useContext(BaseUrlContext);

  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <a {...attrs} href={getHref(href, baseUrl)} target={target} title={title} {...docLink(href)}>
      {children}
    </a>
  );
}

export default Anchor;
