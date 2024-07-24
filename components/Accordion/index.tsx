import React, { useState } from 'react';

import './style.scss';

const Accordion = ({ children, title }) => {
  const [active, setActive] = useState(false);

  const handleToggle = () => {
    setActive(!active);
  }
  
  return (
    <div className="Accordion">
      <button className="title" onClick={handleToggle}>
        {title}
        <i className={`icon${active && '_active'} fa fa-chevron-right`}></i>
      </button>
      <div className={`content content${active && '_active'}`}>{children}</div>
    </div>
  );
};

export default Accordion;
