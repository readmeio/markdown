import React, { useState } from 'react';

import './style.scss';

interface Props extends React.PropsWithChildren<{ icon?: string; iconColor?: string; title: string }> {}

const Accordion = ({ children, icon, iconColor, title }: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <details className="Accordion" onToggle={() => setIsOpen(!isOpen)}>
      <summary className="Accordion-title">
        <i className={`Accordion-toggleIcon${isOpen ? '_opened' : ''} fa fa-regular fa-chevron-right`}></i>
        {icon && <i className={`Accordion-icon fa-duotone fa-solid ${icon}`} style={{ color: `${iconColor}` }}></i>}
        {title}
      </summary>
      <div className="Accordion-content">{children}</div>
    </details>
  );
};

export default Accordion;

