import React from 'react';

interface FaviconProps {
  src: string;
  alt?: string;
}

const Favicon = ({ src, alt = 'favicon', ...attr }: FaviconProps) => (
  <img {...attr} alt={alt} height="14" src={src} width="14" />
);

interface EmbedProps {
  lazy?: boolean;
  url: string;
  title: string;
  provider?: string;
  html?: string;
  iframe?: boolean;
  image?: string;
  favicon?: string;
}

const Embed = ({ lazy = true, url, provider, title, html, iframe, image, favicon, ...attrs }: EmbedProps) => {
  if (iframe) {
    return <iframe {...attrs} src={url} style={{ border: 'none', display: 'flex', margin: 'auto' }} />;
  }

  if (!provider)
    provider = new URL(url).hostname
      .split(/(?:www)?\./)
      .filter(i => i)
      .join('.');

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
              {!favicon || <Favicon alt={provider} src={favicon} />}
              {provider && (
                <small className="embed-provider">
                  {provider.search(/^@{1}/) < 0 ? (
                    provider
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
