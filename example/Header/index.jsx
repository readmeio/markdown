import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';

function Header() {
  const initialTheme = localStorage.getItem('color-scheme');
  const [colorMode, setColorMode] = useState(initialTheme || 'auto');
  const htmlEl = document.querySelector('[data-color-mode]');

  // on load
  useEffect(() => initialTheme && htmlEl.setAttribute('data-color-mode', initialTheme));

  // on change
  useEffect(() => {
    htmlEl.setAttribute('data-color-mode', colorMode);
    localStorage.setItem('color-scheme', colorMode);
  }, [colorMode, htmlEl]);

  return (
    <header className="rdmd-demo--header">
      <div className="rdmd-demo--header-content">
        <a className="rdmd-demo--header-logo" href="https://github.com/readmeio/markdown">
          <b>@readme/markdown</b>
        </a>
        <h1>
          <code>@readme/markdown</code>
        </h1>
        <select onChange={e => setColorMode(e.target.value)} value={colorMode}>
          <option disabled value="">
            Choose Color Scheme
          </option>
          <option value="auto">Same as System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
        <a href="https://rdmd.readme.io" id="docsLink">
          Read the docs→
        </a>
      </div>
    </header>
  );
}

Header.propTypes = {
  colorMode: PropTypes.oneOf(['auto', 'light', 'dark']),
  setColorMode: PropTypes.func,
};

export default Header;
