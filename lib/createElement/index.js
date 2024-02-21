const React = require('react');

const { CodeTabs } = require('../../components/CodeTabs');

const createElement = (type, props, ...children) => {
  const rdmdType = type === 'div' && props?.className === 'code-tabs' ? CodeTabs : type;

  return React.createElement(rdmdType, props, ...children);
};

module.exports = createElement;
