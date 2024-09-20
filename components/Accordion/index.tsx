import React, { useState } from 'react';

import './style.scss';

const Accordion = ({ children, icon, iconColor, title }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <details className="Accordion" onToggle={() => setIsOpen(!isOpen)}>
      <summary className="Accordion-title">
        <i className={`Accordion-toggleIcon${isOpen ? '_opened' : ''} <i class="fa fa-regular fa-chevron-right"></i>`}></i>
        {icon && <i className={`Accordion-icon fa-duotone fa-solid ${icon}`} style={{ color: `${iconColor}` }}></i>}
        {title}
      </summary>
      <div className="Accordion-content">{children}</div>
    </details>
  );
};

export default Accordion;