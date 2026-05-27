import React, { useMemo, useState } from 'react';

import './style.scss';

interface Props extends React.PropsWithChildren<{ icon?: string; iconColor?: string; title: string }> {}

const Accordion = ({ children, icon, iconColor, title }: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  const isFontAwesome = icon?.startsWith('fa-');
  const colorStyle = useMemo(() => ({ color: `${iconColor}` } as React.CSSProperties), [iconColor]);

  return (
    <details className="Accordion" onToggle={() => setIsOpen(!isOpen)}>
      <summary className="Accordion-title">
        <i className={`Accordion-toggleIcon${isOpen ? '_opened' : ''} fa fa-regular fa-chevron-right`}></i>
        {icon &&
          (isFontAwesome ? (
            <i className={`Accordion-icon fa-duotone fa-solid ${icon}`} style={colorStyle}></i>
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
