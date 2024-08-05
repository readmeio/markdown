const PropTypes = require('prop-types');
const React = require('react');

function TableOfContents({ children }) {
  return (
    <nav>
      <ul className="toc-list">
        <li>
          {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
          <a className="tocHeader" href="#">
            <i className="icon icon-text-align-left"></i>
            Table of Contents
          </a>
        </li>
        <li className="toc-children">{children}</li>
      </ul>
    </nav>
  );
}

TableOfContents.propTypes = {
  children: PropTypes.element,
};

module.exports = TableOfContents;
