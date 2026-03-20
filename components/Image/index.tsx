import * as React from 'react';
import { createPortal } from 'react-dom';

interface ImageProps {
  align?: string;
  alt?: string;
  // MDXish passes JSX expression values as strings (e.g., border={false} becomes "false")
  border?: boolean | string;
  caption?: string;
  children?: [React.ReactElement];
  className?: string;
  height?: string;
  lazy?: boolean;
  src: string;
  title?: string;
  width?: string;
}

/**
 * Renders lightbox overlay via a React portal to document.body so it escapes
 * any intermediate CSS stacking contexts and reliably covers all UI chrome.
 */
const LightboxPortal = ({ children }: { children: React.ReactNode }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
};

const Image = (Props: ImageProps) => {
  const {
    align = '',
    alt = '',
    border: borderProp = false,
    caption,
    className = '',
    height = 'auto',
    src,
    title = '',
    width = 'auto',
    lazy = true,
    children,
  } = Props;

  // Normalize border: MDXish passes {false} as the string "false", not a boolean
  const border = borderProp === true || borderProp === 'true';

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

  const imgElement = (
    <img
      alt={alt}
      className={`img ${caption || children ? 'img-align-center' : align ? `img-align-${align}` : ''} ${border ? 'border' : ''}`}
      height={height}
      loading={lazy ? 'lazy' : 'eager'}
      src={src}
      title={title}
      width={width}
    />
  );

  const lightboxOverlay = lightbox ? (
    <LightboxPortal>
      <div className="markdown-body">
        <span
          aria-label={alt || 'Collapse image'}
          className="img lightbox open"
          onClick={toggle}
          onKeyDown={handleKeyDown}
          role={'button'}
          tabIndex={0}
        >
          <span className="lightbox-inner">
            {imgElement}
            {(children || caption) && <figcaption>{children || caption}</figcaption>}
          </span>
        </span>
        <button aria-label="Minimize image" className="lightbox-close" onClick={toggle} type="button">
          <i aria-hidden="true" className="fa-solid fa-xmark" />
        </button>
      </div>
    </LightboxPortal>
  ) : null;

  if (children || caption) {
    return (
      <figure>
        <span
          aria-label={alt}
          className="img lightbox closed"
          onClick={toggle}
          onKeyDown={handleKeyDown}
          role={'button'}
          tabIndex={0}
        >
          <span className="lightbox-inner">
            {imgElement}
            <figcaption>{children || caption}</figcaption>
          </span>
        </span>
        {lightboxOverlay}
      </figure>
    );
  }

  return (
    <>
      <span
        aria-label="Expand image"
        className="img lightbox closed"
        onClick={toggle}
        onKeyDown={handleKeyDown}
        role={'button'}
        tabIndex={0}
      >
        <span className="lightbox-inner">{imgElement}</span>
      </span>
      {lightboxOverlay}
    </>
  );
};

export default Image;
