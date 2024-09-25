import React, { useState } from 'react';

import './style.scss';

export const Tab = ({ children }) => {
  return (
    <div className="TabContent">
      {children}
    </div>
  )
}

const Tabs = ({ children }) => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="TabGroup">
      <header>
        <nav className="TabGroup-nav">
          {children?.map((tab, index: number) =>
            <button className={`TabGroup-tab${activeTab === index ? '_active' : ''}`} key={tab.props.title} onClick={() => setActiveTab(index)}>
              {tab.props.icon && <i className={`TabGroup-icon fa-duotone fa-solid ${tab.props.icon}`} style={{ color: `${tab.props.iconColor}` }}></i>}
              {tab.props.title}
            </button>
          )}
        </nav>
      </header>
      <section>
        {children && children[activeTab]}
      </section>
    </div>
  );
};

export default Tabs;
