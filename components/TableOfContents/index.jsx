import PropTypes from 'prop-types';
import React, { useEffect, useRef } from 'react';

const TableOfContents = ({ children }) => {
  const tableOfContentsEl = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const id = entry.target.getAttribute('id');

        if (entry.intersectionRatio > 0) {
          tableOfContentsEl.current.querySelectorAll('a')?.forEach(el => el.classList.remove('active'));
          tableOfContentsEl.current.querySelector(`a[href="#${id}"]`)?.classList.add('active');
        }
      });
    });

    document.querySelectorAll('.heading-anchor[id]').forEach(heading => {
      observer.observe(heading);
    });
  }, []);

  return (
    <nav ref={tableOfContentsEl} className="rm-TableOfContents">
      <ul className="toc-list">
        <li>
          {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
          <a className="tocHeader" href="#">
            Table of Contents
          </a>
        </li>
        <li className="toc-children">{children}</li>
      </ul>
    </nav>
  );
};

TableOfContents.propTypes = {
  children: PropTypes.element,
};

export default TableOfContents;
