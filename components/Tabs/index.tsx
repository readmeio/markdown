import React, { useState } from 'react';

import Icon from '../Icon';

import './style.scss';

export const Tab = ({ children }: React.PropsWithChildren) => {
  return <div className="TabContent">{children}</div>;
};

interface TabsProps {
  children?: React.ReactNode;
}

const Tabs = ({ children }: TabsProps) => {
  const [activeTab, setActiveTab] = useState(0);
  // React passes `children` as a single element when there's only one child, so normalize.
  const tabs = React.Children.toArray(children) as React.ReactElement[];

  return (
    <div className="TabGroup">
      <header>
        <nav className="TabGroup-nav">
          {tabs.map((tab, index: number) => (
            <button
              key={tab.props.title}
              className={`TabGroup-tab${activeTab === index ? '_active' : ''}`}
              onClick={() => setActiveTab(index)}
            >
              {tab.props.icon && (
                <Icon className="TabGroup-icon" icon={tab.props.icon} iconColor={tab.props.iconColor} />
              )}
              {tab.props.title}
            </button>
          ))}
        </nav>
      </header>
      <section>{tabs[activeTab]}</section>
    </div>
  );
};

export default Tabs;
