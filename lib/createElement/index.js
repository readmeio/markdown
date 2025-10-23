const React = require('react');

const CreateCodeTabs = require('../../components/CodeTabs');

const createElement =
  opts =>
  // eslint-disable-next-line react/display-name
  (type, props, ...children) => {
    const rdmdType = type === 'div' && props?.className === 'code-tabs' ? CreateCodeTabs(opts) : type;

    return React.createElement(rdmdType, props, ...children);
  };

module.exports = createElement;
