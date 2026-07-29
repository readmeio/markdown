import * as React from 'react';
import { createPortal } from 'react-dom';
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';

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
  height?: number | string;
  lazy?: boolean;
  src: string;
  style?: React.CSSProperties;
  title?: string;
  width?: number | string;
  wrap?: boolean | string;
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
    height = Props.style?.height ?? 'auto',
    src,
    style,
    title = '',
    width = Props.style?.width ?? 'auto',
    lazy = true,
    children,
    wrap: wrapProp,
  } = Props;

  // Normalize border/framed: MDXish passes {false} as the string "false", not a boolean
  const border = borderProp === true || borderProp === 'true';
  const framed = framedProp === true || framedProp === 'true';
  // Default (undefined) keeps legacy behavior: left/right images float and wrap text.
  const noWrap = (align === 'left' || align === 'right') && (wrapProp === false || wrapProp === 'false');

  const [lightbox, setLightbox] = React.useState(false);
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);

  // While the lightbox is open, move focus into the overlay and close it on
  // Escape / Cmd+. from anywhere — the zoom/pan surface may hold pointer focus,
  // so a document-level listener keeps the keyboard shortcuts reliable.
  React.useEffect(() => {
    if (!lightbox) return undefined;

    closeButtonRef.current?.focus();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || (e.metaKey && e.key === '.')) setLightbox(false);
    };
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [lightbox]);

  if (className === 'emoji') {
    return (
      <img
        alt={alt}
        height={height}
        loading={lazy ? 'lazy' : 'eager'}
        src={src}
        style={style}
        title={title}
        width={width}
      />
    );
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
  const imgClass = `img ${caption || children || framed ? 'img-align-center' : align ? `img-align-${align}` : ''} ${border ? 'border' : ''}${noWrap ? ' img-no-wrap' : ''}`;
  const imgElement = (
    <img
      alt={alt}
      className={imgClass}
      height={height}
      loading={lazy ? 'lazy' : 'eager'}
      src={src}
      style={style}
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
        <span className="img lightbox open">
          <TransformWrapper
            centerOnInit
            doubleClick={{ mode: 'zoomIn', step: 0.7 }}
            initialScale={1}
            maxScale={8}
            minScale={1}
            pinch={{ step: 5 }}
            wheel={{ step: 0.2 }}
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                <TransformComponent
                  contentStyle={{ alignItems: 'center', height: '100%', justifyContent: 'center', width: '100%' }}
                  wrapperClass="lightbox-canvas"
                  wrapperStyle={{ flex: '1 1 0', minHeight: 0, width: '100%' }}
                >
                  {imgElement}
                </TransformComponent>
                {(children || caption) && <figcaption>{children || caption}</figcaption>}
                <div className="lightbox-controls">
                  <button aria-label="Zoom in" className="lightbox-control" onClick={() => zoomIn()} type="button">
                    <i aria-hidden="true" className="fa-solid fa-magnifying-glass-plus" />
                  </button>
                  <button aria-label="Zoom out" className="lightbox-control" onClick={() => zoomOut()} type="button">
                    <i aria-hidden="true" className="fa-solid fa-magnifying-glass-minus" />
                  </button>
                  <button
                    aria-label="Reset zoom"
                    className="lightbox-control"
                    onClick={() => resetTransform()}
                    type="button"
                  >
                    <i aria-hidden="true" className="fa-solid fa-arrows-rotate" />
                  </button>
                </div>
              </>
            )}
          </TransformWrapper>
        </span>
        <button
          ref={closeButtonRef}
          aria-label="Minimize image"
          className="lightbox-close"
          onClick={toggle}
          type="button"
        >
          <i aria-hidden="true" className="fa-solid fa-xmark" />
        </button>
      </div>
    </LightboxPortal>
  ) : null;

  if (framed) {
    const frameClass = `img-frame img-frame-${align || 'center'}${noWrap ? ' img-no-wrap' : ''}`;
    // Only left/right wrapping frames shrink to fit; for those, hoist percentage
    // widths onto the wrapper since they can't resolve against a shrink-to-fit parent.
    const isClamped = (align === 'left' || align === 'right') && !noWrap;
    const frameStyle: React.CSSProperties | undefined =
      isClamped && typeof width === 'string' && width.endsWith('%') ? { width } : undefined;
    if (children || caption) {
      return (
        <figure className={frameClass} style={frameStyle}>
          {closedLightbox(alt || 'Expand image', imgElement)}
          {lightboxOverlay}
          <figcaption>{children || caption}</figcaption>
        </figure>
      );
    }
    return (
      <div className={frameClass} style={frameStyle}>
        {closedLightbox(alt || 'Expand image', imgElement)}
        {lightboxOverlay}
      </div>
    );
  }

  if (children || caption) {
    // Mirrors the framed pattern: left/right captioned figures float and shrink
    // to fit so a long caption doesn't widen the float past the image.
    const isFloating = (align === 'left' || align === 'right') && !noWrap;
    const figureClass = [
      (align === 'left' || align === 'right') && `img-figure-${align}`,
      noWrap && 'img-no-wrap',
    ]
      .filter(Boolean)
      .join(' ');
    const figureStyle: React.CSSProperties | undefined =
      isFloating && typeof width === 'string' && width.endsWith('%') ? { width } : undefined;
    return (
      <figure className={figureClass || undefined} style={figureStyle}>
        {closedLightbox(alt || 'Expand image', imgElement)}
        {lightboxOverlay}
        <figcaption>{children || caption}</figcaption>
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
