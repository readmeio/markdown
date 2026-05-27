import React, { useState } from 'react';

import './style.scss';

/** @see https://docs-v5.fontawesome.com/web/reference-icons */
const FA_PREFIXES = new Set(['fab', 'fad', 'far']);

interface Props extends React.PropsWithChildren<{ icon?: string; iconColor?: string; title: string }> {}

const Accordion = ({ children, icon, iconColor, title }: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  const hasFontAwesomePrefix = FA_PREFIXES.has(icon?.split(' ')[0] ?? '');
  const isFontAwesome = hasFontAwesomePrefix || icon?.startsWith('fa-');
  const faClasses = hasFontAwesomePrefix ? icon! : `fad ${icon}`; // if no prefix is passed, fall back to a duotone icon by default

  return (
    <details className="Accordion" onToggle={() => setIsOpen(!isOpen)}>
      <summary className="Accordion-title">
        <i className={`Accordion-toggleIcon${isOpen ? '_opened' : ''} fa fa-regular fa-chevron-right`}></i>
        {icon &&
          (isFontAwesome ? (
            <i className={`Accordion-icon ${faClasses}`} style={ iconColor ? { color: iconColor } : undefined}></i>
          ) : (
            <span className="Accordion-icon">{icon}</span>
          ))}
        {title}
      </summary>
      <div className="Accordion-content">{children}</div>
    </details>
  );
};

export default Accordion;
