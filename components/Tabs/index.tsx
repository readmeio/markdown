import React, { useState } from 'react';

import useRestartAnimatedImages from '../../hooks/useRestartAnimatedImages';
import useRevealHashTarget from '../../hooks/useRevealHashTarget';
import Icon from '../Icon';
import { noTranslateTagsToSpans } from '../NoTranslate';

import './style.scss';

export const Tab = ({ children }: React.PropsWithChildren) => {
  return <div className="TabContent">{children}</div>;
};

interface TabsProps {
  children?: React.ReactNode;
}

const Tabs = ({ children }: TabsProps) => {
  const [activeTab, setActiveTab] = useState(0);
  const panelRefs = useRestartAnimatedImages(activeTab);
  useRevealHashTarget(panelRefs, setActiveTab);
  // React passes `children` as a single element when there's only one child, so normalize.
  const tabs = React.Children.toArray(children) as React.ReactElement[];

  return (
    <div className="TabGroup">
      <header>
        <nav className="TabGroup-nav">
          {tabs.map((tab, index: number) => {
            const normalizedTitle = noTranslateTagsToSpans(tab.props.title);

            return (
              <button
                key={tab.key}
                className={`TabGroup-tab${activeTab === index ? '_active' : ''}`}
                onClick={() => setActiveTab(index)}
              >
                {tab.props.icon && (
                  <Icon className="TabGroup-icon" icon={tab.props.icon} iconColor={tab.props.iconColor} />
                )}
                {normalizedTitle}
              </button>
            );
          })}
        </nav>
      </header>
      <section>
        {/* Keep every panel mounted so runtime Tailwind can scan inactive tabs' classes on first paint */}
        {tabs.map((tab, index: number) => (
          <div
            key={tab.key}
            ref={el => {
              panelRefs.current[index] = el;
            }}
            hidden={index !== activeTab}
          >
            {tab}
          </div>
        ))}
      </section>
    </div>
  );
};

export default Tabs;
