import * as React from 'react';

interface Props extends React.PropsWithChildren<React.HTMLAttributes<HTMLImageElement>> {
  align: string;
  alt: string;
  border: boolean;
  caption: string;
  className: string;
  height: string;
  lazy: boolean;
  src: string;
  title: string;
  width: string;
}

const Image = (props: Props) => {
  const [lightbox, setLightbox] = React.useState(false);

  const { 
    align = '',
    alt = '',
    border = false,
    caption,
    className = '',
    height = 'auto',
    lazy,
    src = '',
    title = '',
    width = 'auto'
  } = props;

  if (className === 'emoji') {
    return <img src={src} width={width} height={height} title={title} alt={alt} loading={lazy ? 'lazy' : 'eager'} />;
  }

  const handleKeyDown = ({ key, metaKey: cmd, preventDefault }: React.KeyboardEvent<HTMLImageElement>) => {
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
        preventDefault();
      default:
    }

  }

  const toggle = () => {
    if (className === 'emoji') return;
    setLightbox(!lightbox);
  }

  if (caption) {
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
          </span>
        </span>
        <figcaption>{caption}</figcaption>
      </figure>
    );
  }

  return (
    <p>
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
            className={`img img-align-${align} ${border ? 'border' : ''}`}
            alt={alt}
            loading={lazy ? 'lazy' : 'eager'}
          />
        </span>
      </span>
    </p>
  );
};

Image.sanitize = sanitizeSchema => {
  sanitizeSchema.attributes['image'] = [
    'align',
    'alt',
    'border',
    'caption',
    'className',
    'height',
    'lazy',
    'src',
    'title',
    'width'
  ];

  return sanitizeSchema;
};

export default Image;