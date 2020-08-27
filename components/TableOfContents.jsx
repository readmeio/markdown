const React = require('react');
const PropTypes = require('prop-types');

function TableOfContents({ children }) {
  return (
    <div className="nav">
      <ul className="toc-list">
        <li>
          {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
          <a className="tocHeader" href="">
            <i className="icon icon-text-align-left"></i>
            Table of Contents
          </a>
        </li>
        {children}
      </ul>
    </div>
  );
}

TableOfContents.propTypes = {
  children: PropTypes.element,
};

module.exports = TableOfContents;
