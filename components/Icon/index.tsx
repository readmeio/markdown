import React from 'react';

/** @see https://docs-v5.fontawesome.com/web/reference-icons */
const FA_PREFIXES = new Set(['fa', 'fab', 'fad', 'fal', 'far', 'fas', 'fast', 'fasl', 'fasr', 'fass', 'fat']);

interface Props {
  /** class applied to the rendered element */
  className: string;
  /** Emoji or Font Awesome class string (e.g. `fa-book`, `fad fa-book`). Bare `fa-` icons fall back to the `fad` duotone prefix. */
  icon: string;
  /** Inline `color` style applied to Font Awesome icons. Has no effect on emoji. */
  iconColor?: string;
}

/**
 * Renders an icon element, either as a Font Awesome icon or an emoji.
 */
const Icon = ({ className, icon, iconColor }: Props) => {
  const hasFontAwesomePrefix = FA_PREFIXES.has(icon.split(' ')[0]);
  const isFontAwesome = hasFontAwesomePrefix || icon.startsWith('fa-');

  if (!isFontAwesome) {
    return <span className={className}>{icon}</span>;
  }

  const faClasses = hasFontAwesomePrefix ? icon : `fad ${icon}`;

  return <i className={`${className} ${faClasses}`} style={iconColor ? { color: iconColor } : undefined}></i>;
};

export default Icon;
