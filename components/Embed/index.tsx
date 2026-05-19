/* eslint-disable no-param-reassign */
/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';

interface FaviconProps {
  alt?: string;
  src: string;
}

const Favicon = ({ src, alt = 'favicon', ...attr }: FaviconProps) => (
  <img {...attr} alt={alt} height="14" src={src} width="14" />
);

interface EmbedProps {
  favicon?: string;
  html?: string;
  iframe?: boolean | string;
  image?: string;
  lazy?: boolean;
  providerName?: string;
  providerUrl?: string;
  title: string;
  typeOfEmbed?: string;
  url: string;
}

// Embed types we trust to be iframe-renderable directly from the persisted url.
// Editors that produce these embeds are responsible for normalizing the url to its iframe-ready form.
const IFRAME_DERIVABLE_TYPES = new Set(['youtube', 'jsfiddle', 'pdf']);

const Embed = ({
  lazy = true,
  url,
  html,
  providerName,
  providerUrl,
  title,
  iframe,
  image,
  favicon,
  typeOfEmbed,
  ...attrs
}: EmbedProps) => {
  const explicitOptOut = iframe === false || iframe === 'false';
  if (typeof iframe !== 'boolean') iframe = iframe === 'true' || typeOfEmbed === 'iframe';

  if (html) {
    try {
      if (html !== decodeURIComponent(html)) {
        html = decodeURIComponent(html);
      } else if (html === 'false') {
        html = undefined;
      }
    } catch (e) {
      // html wasn't HTML apparently
      html = undefined;
    }
  }

  if (iframe) {
    return <iframe {...attrs} src={url} style={{ border: 'none', display: 'flex', margin: 'auto' }} title={title} />;
  }

  // Fall back to a direct iframe for URL-derivable embed types when html is missing.
  if (!html && !explicitOptOut && url && typeOfEmbed && IFRAME_DERIVABLE_TYPES.has(typeOfEmbed)) {
    return <iframe {...attrs} src={url} style={{ border: 'none', display: 'flex', margin: 'auto' }} title={title} />;
  }

  if (!providerUrl && url)
    providerUrl = new URL(url).hostname
      .split(/(?:www)?\./)
      .filter(i => i)
      .join('.');

  if (!providerName) providerName = providerUrl;

  const classes = ['embed', image ? 'embed_hasImg' : ''];

  return (
    <div className={classes.join(' ')}>
      {html ? (
        <div className="embed-media" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <a className="embed-link" href={url} rel="noopener noreferrer" target="_blank">
          {!image || <img alt={title} className="embed-img" loading={lazy ? 'lazy' : undefined} src={image} />}
          {title && title !== '@embed' ? (
            <div className="embed-body">
              {!favicon || <Favicon alt={providerName} src={favicon} />}
              {providerUrl && (
                <small className="embed-provider">
                  {providerUrl.search(/^@{1}/) < 0 ? (
                    providerName
                  ) : (
                    <code style={{ fontFamily: 'var(--md-code-font, monospace)' }}>{url}</code>
                  )}
                </small>
              )}
              <div className="embed-title">{title}</div>
            </div>
          ) : (
            <div className="embed-body">
              <b>View</b>: <span className="embed-body-url">{url}</span>
            </div>
          )}
        </a>
      )}
    </div>
  );
};

export default Embed;
