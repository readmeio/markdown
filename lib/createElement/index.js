const React = require('react');

const CreateCodeTabs = require('../../components/CodeTabs');

/*
 * To get around hast/html sanitation, we pass custom components through using
 * className's. Then we hijack `React.createElement` so we can render the associated component
 * instead. If we use a custom `Div` like we do with MDX, `remarkRehype`
 * inserts an extra root div, and that messes with our styles. Fun!
 */

const createElement =
  opts =>
  // eslint-disable-next-line react/display-name
  (type, props, ...children) => {
    // eslint-disable-next-line react/prop-types
    const rdmdType = type === 'div' && props?.className === 'code-tabs' ? CreateCodeTabs(opts) : type;

    return React.createElement(rdmdType, props, ...children);
  };

module.exports = createElement;
