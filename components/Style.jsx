const React = require('react');

const Style = ({ children, safeMode }) => {
  return safeMode ? (
    <pre>
      <code>{`<style>\n${children}\n</style>`}</code>
    </pre>
  ) : (
    <style>{children}</style>
  );
};

const CreateStyle =
  ({ safeMode }) =>
  // eslint-disable-next-line react/display-name
  props => <Style {...props} safeMode={safeMode} />;

CreateStyle.sanitize = sanitize => {
  sanitize.tagNames.push('style');

  return sanitize;
};

module.exports = CreateStyle;
