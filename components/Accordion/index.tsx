import React, { useState } from 'react';

import './style.scss';

const AccordionTest = ({ children, icon, iconColor, title }) => {
  return (
    <details className="Accordion">
      <summary className="Accordion-title">
        <i className={`Accordion-icon fa ${icon}`} style={{ color: `${iconColor}` }}></i>{title}
      </summary>
      <div className="Accordion-content">{children}</div>
    </details>
  );
};

const Accordion = ({ children, icon, iconColor, title }) => {
  const [isActive, setIsActive] = useState(false);

  const handleToggle = () => {
    setIsActive(!isActive);
  }

  return (
    <div className="Accordion">
      <button className="Accordion-title" onClick={handleToggle}>
        <i className={`Accordion-arrow${isActive ? '_active' : ''} fa fa-chevron-right`}></i>
        <div><i className={`Accordion-icon fa ${icon}`} style={{ color: `${iconColor}` }}></i>{title}</div>
      </button>
      <div className={`Accordion-content${isActive ? '_active' : ''}`}>{children}</div>
    </div>
  );
};

export default AccordionTest;