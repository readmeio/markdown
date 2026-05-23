import React from 'react';
interface HeaderProps {
    setTheme: (theme: 'dark' | 'light' | 'system') => void;
    theme: 'dark' | 'light' | 'system';
}
declare function Header({ theme, setTheme }: HeaderProps): React.JSX.Element;
export default Header;
