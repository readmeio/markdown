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
        <nav className="nav">
          {children.map((tab, index: number) => 
            <button className={`tab${activeTab === index ? '_active' : ''}`} key={tab.props.title} onClick={() => setActiveTab(index)}>
              {tab.props.title}
            </button>
          )}
        </nav>
      </header>
      <section>
        {children[activeTab]}
      </section>
    </div>
  );
};

export default Tabs;
