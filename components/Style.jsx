const React = require('react');
const PropTypes = require('prop-types');

const Style = ({ children, safeMode }) => {
  return safeMode ? (
    <pre>
      <code>{`<style>\n${children}\n</style>`}</code>
    </pre>
  ) : (
    <style>{children}</style>
  );
};

Style.propTypes = {
  children: PropTypes.node,
  safeMode: PropTypes.bool,
};

export default Style;

const CreateStyle =
  ({ safeMode }) =>
  // eslint-disable-next-line react/display-name
  props =>
    <Style {...props} safeMode={safeMode} />;

module.exports = (sanitize, opts) => {
  sanitize.tagNames.push('style');

  return CreateStyle(opts);
};
