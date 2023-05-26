const React = require('react');

const { CodeTabs } = require('../../components/CodeTabs');
const Mermaid = require('../../components/Mermaid');
const { MERMAID_BLOCK_LANG } = require('../../constants');

const classMap = {
  'code-tabs': CodeTabs,
  [MERMAID_BLOCK_LANG]: Mermaid,
};

const createElement = (type, props, ...children) => {
  const rdmdType = type === 'div' && props?.className in classMap ? classMap[props.className] : type;

  return React.createElement(rdmdType, props, ...children);
};

module.exports = createElement;
