import React from 'react';

function Header(props) {
  return (
    <header className="rdmd-demo--header">
      <div className="rdmd-demo--header-content">
        <a className="rdmd-demo--header-logo" href="https://github.com/readmeio/markdown">
          @readme/markdown
        </a>
        <h1>Markdown Demo</h1>
      </div>
    </header>
  );
}

export default Header;
