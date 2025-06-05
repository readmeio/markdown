import * as React from 'react';
import emojiRegex from 'emoji-regex';

interface Props extends React.PropsWithChildren<React.HTMLAttributes<HTMLQuoteElement>> {
  attributes?: Record<string, unknown>;
  empty?: boolean;
  icon?: string;
  theme: string;
}

export const themes: Record<string, string> = {
  'error': 'error',
  'default': 'default',
  'info': 'info',
  'okay': 'okay',
  'warn': 'warn',
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

export const defaultIcons = {
  info: '\uD83D\uDCD8',
  warn: '\uD83D\uDEA7',
  okay: '\uD83D\uDC4D',
  error: '\u2757\uFE0F',
};

const Callout = (props: Props) => {
  const { attributes, children, theme, empty } = props;
  const icon = props.icon || defaultIcons[theme] || '❗';
  const isEmoji = emojiRegex().test(icon);

  return (
    // @ts-expect-error -- theme is not a valid attribute
    // eslint-disable-next-line react/jsx-props-no-spreading, react/no-unknown-property
    <blockquote {...attributes} className={`callout callout_${theme}`} theme={icon}>
      <h3 className={`callout-heading${empty ? ' empty' : ''}`}>
        {isEmoji ? <span className="callout-icon">{icon}</span> : <span className={`callout-icon callout-icon_fa ${icon}`} />}
        {empty || React.Children.toArray(children)[0]}
      </h3>
      {React.Children.toArray(children).slice(1)}
    </blockquote>
  );
};

export default Callout;
