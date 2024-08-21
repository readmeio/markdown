import React, { useState } from 'react';

import './style.scss';

const Accordion = ({ children, icon, iconColor, title }) => {
  return (
    <details className="Accordion">
      <summary className="Accordion-title">
       {icon && <i className={`Accordion-icon fa ${icon}`} style={{ color: `${iconColor}` }}></i>}
       {title}
      </summary>
      <div className="Accordion-content">{children}</div>
    </details>
  );
};

export default Accordion;