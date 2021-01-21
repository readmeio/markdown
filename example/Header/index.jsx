import React from 'react';

function Header() {
  return (
    <header className="rdmd-demo--header">
      <div className="rdmd-demo--header-content">
        <a className="rdmd-demo--header-logo" href="https://github.com/readmeio/markdown">
          <b>@readme/markdown</b>
        </a>
        <h1>
          <code>@readme/markdown</code>
        </h1>
        <a href="https://rdmd.readme.io" id="docsLink">
          Read the docs→
        </a>
      </div>
    </header>
  );
}

export default Header;
