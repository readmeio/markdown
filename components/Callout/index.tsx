import * as React from 'react';

interface Props extends React.PropsWithChildren<React.HTMLAttributes<HTMLQuoteElement>> {
  attributes: {};
  icon: string;
  theme: string;
  heading?: React.ReactElement;
}

const Callout = (props: Props) => {
  const { attributes, children, theme, icon, heading } = props;

  return (
    // @ts-ignore
    <blockquote {...attributes} className={`callout callout_${theme}`} theme={icon}>
      {heading && (
        <h3 className={`callout-heading${heading ? '' : ' empty'}`}>
          <span className="callout-icon">{icon}</span>
          {heading}
        </h3>
      )}
      {children}
    </blockquote>
  );
};

Callout.sanitize = sanitizeSchema => {
  sanitizeSchema.attributes['rdme-callout'] = ['icon', 'theme', 'heading'];

  return sanitizeSchema;
};

export default Callout;
