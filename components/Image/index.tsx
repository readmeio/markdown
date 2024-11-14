import * as React from 'react';

interface ImageProps {
  align?: string;
  alt?: string;
  border?: boolean;
  caption?: string;
  className?: string;
  height?: string;
  src: string;
  title?: string;
  width?: string;
  lazy?: boolean;
  children?: [React.ReactElement];
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
    return <img src={src} width={width} height={height} title={title} alt={alt} loading={lazy ? 'lazy' : 'eager'} />;
  }

  const handleKeyDown = ({ key, metaKey: cmd }: React.KeyboardEvent<HTMLImageElement>) => {
    const cmdKey = cmd ? 'cmd+' : '';
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
              src={src}
              width={width}
              height={height}
              title={title}
              className={`img img-align-center ${border ? 'border' : ''}`}
              alt={alt}
              loading={lazy ? 'lazy' : 'eager'}
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
          src={src}
          width={width}
          height={height}
          title={title}
          className={`img ${align ? `img-align-${align}` : ''} ${border ? 'border' : ''}`}
          alt={alt}
          loading={lazy ? 'lazy' : 'eager'}
        />
      </span>
    </span>
  );
};

export default Image;
