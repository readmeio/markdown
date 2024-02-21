import React from 'react';

function Header() {
  return (
    <header className="rdmd-demo--header">
      <div className="rdmd-demo--header-content">
        <a className="rdmd-demo--header-logo" href="https://github.com/readmeio/mdx" rel="noreferrer" target="_blank">
          <b>@readme/rmdx</b>
        </a>
        <h1>
          <code>@readme/rmdx</code>
        </h1>
        <a href="https://rdmd.readme.io" id="docsLink" rel="noreferrer" target="_blank">
          Read the docs →
        </a>
      </div>
    </header>
  );
}

export default Header;
