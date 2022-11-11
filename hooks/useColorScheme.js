import { useEffect, useState } from 'react';

import useMediaQuery from './useMediaQuery';

const useColorScheme = () => {
  const htmlEl = typeof document === 'undefined' ? null : document.querySelector('[data-color-mode]');
  const [colorMode, setColorMode] = useState(htmlEl ? htmlEl?.getAttribute('data-color-mode') : 'light');
  const storedTheme = typeof localStorage === 'undefined' ? 'auto' : localStorage?.getItem('color-scheme');
  const userColorScheme = useMediaQuery('(prefers-color-scheme: dark)') ? 'dark' : 'light';

  /* color scheme is determined by:
  1. Check if project defaults to "Same as System" (auto)
  2. If above is true and user has not set a project preference, use their OS preference
  3. Else use their project preference
  4. Else use project default (light or dark)
  */
  const colorScheme = colorMode === 'auto' && storedTheme === 'auto' ? userColorScheme : storedTheme || colorMode;
  useEffect(() => {
    if (!htmlEl) return;
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.attributeName === 'data-color-mode')
          setColorMode(mutation.target.attributes['data-color-mode'].value);
      });
    });
    observer.observe(htmlEl, { attributes: true });
    // eslint-disable-next-line consistent-return
    return () => observer.disconnect();
  }, [htmlEl]);

  return colorScheme;
};

export default useColorScheme;
