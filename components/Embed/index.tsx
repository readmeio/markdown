import React from 'react';

interface FaviconProps {
  src?: string;
  alt?: string;
}

const Favicon = ({ src, alt = 'favicon', ...attr }: FaviconProps) => (
  <img {...attr} alt={alt} height="14" src={src} width="14" />
);

interface EmbedProps {
  lazy?: boolean;
  provider?: string;
  url?: string;
  title?: string;
  html?: string;
  iframe?: boolean;
  image?: string;
  favicon?: string;
}

const Embed = ({ lazy = true, provider, url, title, html, iframe, image, favicon, ...attrs }: EmbedProps) => {
  if (!url) {
    return <div />;
  }

  if (iframe) {
    return <iframe {...attrs} src={url} style={{ border: 'none', display: 'flex', margin: 'auto' }} />;
  }

  const classes = ['embed', image ? 'embed_hasImg' : ''];

  return (
    <div className={classes.join(' ')}>
      {html ? (
        <div className="embed-media" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <a className="embed-link" href={url} rel="noopener noreferrer" target="_blank">
          {!image || <img alt={title} className="embed-img" loading={lazy ? 'lazy' : undefined} src={image} />}
          {title ? (
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
