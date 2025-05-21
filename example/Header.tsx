import React from 'react';

interface HeaderProps {
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  theme: 'dark' | 'light' | 'system';
}

function Header({ theme, setTheme }: HeaderProps) {
  return (
    <header className="rdmd-demo--header">
      <div className="rdmd-demo--header-content">
        <a className="rdmd-demo--header-logo" href="https://github.com/readmeio/mdx" rel="noreferrer" target="_blank">
          <b>@readme/rmdx</b>
        </a>
        <h1>
          <code>@readme/rmdx</code>
        </h1>
        <a className={'Header-button'} href="https://rdmd.readme.io" id="docsLink" rel="noreferrer" target="_blank">
          Docs <i aria-label="Opens in a new tab" className="fa-regular fa-arrow-up-right" />
        </a>
        <select className={'Header-select'} onChange={(e) => setTheme(e.target.value as 'dark' | 'light' | 'system')} value={theme}>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </select>
      </div>
    </header>
  );
}

export default Header;
