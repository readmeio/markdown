import * as React from 'react';

interface ImageProps {
  align?: string;
  alt?: string;
  border?: boolean;
  caption?: string;
  children?: [React.ReactElement];
  className?: string;
  height?: string;
  lazy?: boolean;
  src: string;
  title?: string;
  width?: string;
}

const Image = (Props: ImageProps) => {
  const {
    align = '',
    alt = '',
    border = false,
    caption,
    className = '',
    height = 'auto',
    src,
    title = '',
    width = 'auto',
    lazy = true,
    children,
  } = Props;

  const [lightbox, setLightbox] = React.useState(false);

  if (className === 'emoji') {
    return <img alt={alt} height={height} loading={lazy ? 'lazy' : 'eager'} src={src} title={title} width={width} />;
  }

  const handleKeyDown = ({ key, metaKey: cmd }: React.KeyboardEvent<HTMLImageElement>) => {
    const cmdKey = cmd ? 'cmd+' : '';
    // eslint-disable-next-line no-param-reassign
    key = `${cmdKey}${key.toLowerCase()}`;

    switch (key) {
      case 'cmd+.':
      case 'escape':
        // CLOSE
        setLightbox(false);
        break;
      case ' ':
      case 'enter':
        // OPEN
        if (!lightbox) setLightbox(true);
        break;
      default:
    }
  };

  const toggle = () => {
    if (className === 'emoji') return;
    setLightbox(!lightbox);
  };

  if (children || caption) {
    return (
      <figure>
        <span
          aria-label={alt}
          className={`img lightbox ${lightbox ? 'open' : 'closed'}`}
          onClick={toggle}
          onKeyDown={handleKeyDown}
          role={'button'}
          tabIndex={0}
        >
          <span className="lightbox-inner">
            <img
              alt={alt}
              className={`img img-align-center ${border ? 'border' : ''}`}
              height={height}
              loading={lazy ? 'lazy' : 'eager'}
              src={src}
              title={title}
              width={width}
            />
            <figcaption>{children || caption}</figcaption>
          </span>
        </span>
      </figure>
    );
  }

  return (
    <span
      aria-label={`${lightbox ? 'Collapse image' : 'Expand image'}`}
      className={`img lightbox ${lightbox ? 'open' : 'closed'}`}
      onClick={toggle}
      onKeyDown={handleKeyDown}
      role={'button'}
      tabIndex={0}
    >
      <span className="lightbox-inner">
        <img
          alt={alt}
          className={`img ${align ? `img-align-${align}` : ''} ${border ? 'border' : ''}`}
          height={height}
          loading={lazy ? 'lazy' : 'eager'}
          src={src}
          title={title}
          width={width}
        />
      </span>
    </span>
  );
};

export default Image;
