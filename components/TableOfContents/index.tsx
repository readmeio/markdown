import React from 'react';

function TableOfContents({ children, heading = 'Table of Contents' }: React.PropsWithChildren<{ heading?: string }>) {
  return (
    <nav aria-label="Table of contents" role="navigation">
      <ul className="toc-list">
        <li>
          {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
          <a className="tocHeader" href="#">
            <i className="icon icon-text-align-left"></i>
            {heading}
          </a>
        </li>
        <li className="toc-children">{children}</li>
      </ul>
    </nav>
  );
}

export default TableOfContents;
