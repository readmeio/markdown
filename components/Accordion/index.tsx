import React, { useState } from 'react';

import './style.scss';

const Accordion = ({ children, title }) => {
  const [isActive, setIsActive] = useState(false);

  const handleToggle = () => {
    setIsActive(!isActive);
  }

  return (
    <div className="Accordion">
      <button className="title" onClick={handleToggle}>
        <i className={`icon${isActive ? '_active' : ''} fa fa-chevron-right`}></i>
        {title}
      </button>
      <div className={`content content${isActive ? '_active' : ''}`}>{children}</div>
    </div>
  );
};

export default Accordion;