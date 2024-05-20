import * as React from 'react';

interface Props extends React.PropsWithChildren<React.HTMLAttributes<HTMLQuoteElement>> {
  attributes?: {};
  icon: string;
  theme?: string;
  heading?: React.ReactElement;
}

const themes: Record<string, string> = {
  '\uD83D\uDCD8': 'info',
  '\uD83D\uDEA7': 'warn',
  '\u26A0\uFE0F': 'warn',
  '\uD83D\uDC4D': 'okay',
  '\u2705': 'okay',
  '\u2757\uFE0F': 'error',
  '\u2757': 'error',
  '\uD83D\uDED1': 'error',
  '\u2049\uFE0F': 'error',
  '\u203C\uFE0F': 'error',
  '\u2139\uFE0F': 'info',
  '\u26A0': 'warn',
};

const Callout = (props: Props) => {
  const { attributes, children, icon, heading } = props;

  let theme = props.theme || themes[icon] || 'default';

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

export default Callout;
