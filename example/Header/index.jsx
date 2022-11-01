import PropTypes from 'prop-types';
import React from 'react';

function Header({ colorMode, setColorMode }) {
  const toggleTheme = e => setColorMode(e.target.value);
  return (
    <header className="rdmd-demo--header">
      <div className="rdmd-demo--header-content">
        <a className="rdmd-demo--header-logo" href="https://github.com/readmeio/markdown">
          <b>@readme/markdown</b>
        </a>
        <h1>
          <code>@readme/markdown</code>
        </h1>
        <select onChange={toggleTheme} value={colorMode}>
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
