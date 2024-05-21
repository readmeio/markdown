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
  const { attributes, children, icon } = props;

  let theme = props.theme || themes[icon] || 'default';
  const [heading, ...body] = Array.isArray(children) ? children : [children];
  const empty = !heading.props.children;

  return (
    // @ts-ignore
    <blockquote {...attributes} className={`callout callout_${theme}`} theme={icon}>
      <h3 className={`callout-heading${empty ? ' empty' : ''}`}>
        <span className="callout-icon">{icon}</span>
        {!empty && heading}
      </h3>
      {body}
    </blockquote>
  );
};

export default Callout;
