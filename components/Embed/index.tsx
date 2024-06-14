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
  providerName?: string;
  providerUrl?: string;
  html?: string;
  iframe?: boolean;
  image?: string;
  favicon?: string;
  typeOfEmbed?: string;
}

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
  ...attrs
}: EmbedProps) => {
  if (typeof iframe !== 'boolean') iframe = iframe === 'true';
  if (html === 'false') html = undefined;
  if (html !== decodeURIComponent(html || '')) {
    html = decodeURIComponent(html);
  }

  if (iframe) {
    return <iframe {...attrs} src={url} style={{ border: 'none', display: 'flex', margin: 'auto' }} />;
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
