import React from 'react';

interface HeaderProps {
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  theme: 'dark' | 'light' | 'system';
}

const THEME_OPTIONS = [
  { icon: 'fa-regular fa-sun', label: 'Light', value: 'light' },
  { icon: 'fa-regular fa-moon', label: 'Dark', value: 'dark' },
  { icon: 'fa-regular fa-desktop', label: 'System', value: 'system' },
] as const;

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
        <div aria-label="Theme" className="Header-theme-group" role="group">
          {THEME_OPTIONS.map(option => (
            <button
              key={option.value}
              aria-label={option.label}
              aria-pressed={theme === option.value}
              className={`Header-theme-button${theme === option.value ? ' Header-theme-button_active' : ''}`}
              onClick={() => setTheme(option.value)}
              title={option.label}
              type="button"
            >
              <i aria-hidden="true" className={option.icon} />
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

export default Header;
