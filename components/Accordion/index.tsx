import React, { useState } from 'react';

import './style.scss';

const Accordion = ({ children, icon, title }) => {
  const [isActive, setIsActive] = useState(false);

  const handleToggle = () => {
    setIsActive(!isActive);
  }

  return (
    <div className="Accordion">
      <button className="Accordion-title" onClick={handleToggle}>
        <i className={`Accordion-arrow${isActive ? '_active' : ''} fa fa-chevron-right`}></i>
        <div><i className={`Accordion-icon fa ${icon}`}></i>{title}</div>
      </button>
      <div className={`Accordion-content${isActive ? '_active' : ''}`}>{children}</div>
    </div>
  );
};

export default Accordion;