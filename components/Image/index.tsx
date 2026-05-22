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
  // MDXish passes JSX expression values as strings (e.g., framed={false} becomes "false")
  framed?: boolean | string;
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
    framed: framedProp = false,
    height = 'auto',
    src,
    title = '',
    width = 'auto',
    lazy = true,
    children,
  } = Props;

  // Normalize border/framed: MDXish passes {false} as the string "false", not a boolean
  const border = borderProp === true || borderProp === 'true';
  const framed = framedProp === true || framedProp === 'true';

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

  // Framed images center the <img> itself; outer wrapper handles left/right alignment via text-align.
  const imgElement = (
    <img
      alt={alt}
      className={`img ${caption || children || framed ? 'img-align-center' : align ? `img-align-${align}` : ''} ${border ? 'border' : ''}`}
      height={height}
      loading={lazy ? 'lazy' : 'eager'}
      src={src}
      title={title}
      width={width}
    />
  );

  const closedLightbox = (ariaLabel: string, content: React.ReactNode) => (
    <span
      aria-label={ariaLabel}
      className="img lightbox closed"
      onClick={toggle}
      onKeyDown={handleKeyDown}
      role={'button'}
      tabIndex={0}
    >
      <span className="lightbox-inner">{content}</span>
    </span>
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

  if (framed) {
    const frameClass = `img-frame img-frame-${align || 'center'}`;
    if (children || caption) {
      return (
        <figure className={frameClass}>
          {closedLightbox(alt || 'Expand image', imgElement)}
          {lightboxOverlay}
          <figcaption>{children || caption}</figcaption>
        </figure>
      );
    }
    return (
      <div className={frameClass}>
        {closedLightbox(alt || 'Expand image', imgElement)}
        {lightboxOverlay}
      </div>
    );
  }

  if (children || caption) {
    return (
      <figure>
        {closedLightbox(
          alt || 'Expand image',
          <>
            {imgElement}
            <figcaption>{children || caption}</figcaption>
          </>,
        )}
        {lightboxOverlay}
      </figure>
    );
  }

  return (
    <>
      {closedLightbox('Expand image', imgElement)}
      {lightboxOverlay}
    </>
  );
};

export default Image;
