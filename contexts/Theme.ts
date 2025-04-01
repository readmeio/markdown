import { createContext } from 'react';

const ThemeContext = createContext<'dark' | 'light'>('light');

export default ThemeContext;
