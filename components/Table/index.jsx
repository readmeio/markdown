const PropTypes = require('prop-types');
const React = require('react');

function Table(props) {
  const { children } = props;
  return (
    <div className="rdmd-table">
      <div className="rdmd-table-inner">
        <table>{children}</table>
      </div>
    </div>
  );
}

Table.propTypes = {
  children: PropTypes.arrayOf(PropTypes.node).isRequired,
};

module.exports = Table;
