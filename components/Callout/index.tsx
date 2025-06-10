import emojiRegex from 'emoji-regex';
import * as React from 'react';

interface Props extends React.PropsWithChildren<React.HTMLAttributes<HTMLQuoteElement>> {
  attributes?: Record<string, unknown>;
  empty?: boolean;
  icon?: string;
  theme: string;
}

export const themes: Record<string, string> = {
  error: 'error',
  default: 'default',
  info: 'info',
  okay: 'okay',
  warn: 'warn',
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

const CalloutIcon = ({ icon, isEmoji }: { icon: 'string'; isEmoji: boolean }) => {
  return isEmoji ? (
    <span className="callout-icon">{icon}</span>
  ) : (
    <span className={`callout-icon callout-icon_fa ${icon}`} />
  );
};

const Callout = (props: Props) => {
  const { attributes, children, theme = 'default', empty } = props;
  const [heading, ...content] = React.Children.toArray(children);

  const icon = props.icon || defaultIcons[theme] || '❗';
  const isEmoji = emojiRegex().test(icon);

  return (
    // @ts-expect-error -- theme is not a valid attribute
    // eslint-disable-next-line react/jsx-props-no-spreading, react/no-unknown-property
    <blockquote {...attributes} className={`callout callout_${theme}`} theme={icon}>
      <CalloutIcon icon={icon} isEmoji={isEmoji} />
      {empty ? <p className={`callout-heading${empty ? ' empty' : ''}`} /> : heading}
      {content}
    </blockquote>
  );
};

export default Callout;
