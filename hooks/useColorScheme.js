const { useEffect, useState } = require('react');

const useMediaQuery = require('./useMediaQuery');

const useColorScheme = () => {
  const [colorMode, setColorMode] = useState();
  const [htmlEl, setHtmlEl] = useState();
  const [colorScheme, setColorScheme] = useState();
  const storedTheme = localStorage.getItem('color-scheme') || 'auto';
  const userColorScheme = useMediaQuery('(prefers-color-scheme: dark)') ? 'dark' : 'light';

  useEffect(() => {
    setHtmlEl(document.querySelector('[data-color-mode]'));
    setColorMode(htmlEl.getAttribute('data-color-mode'));
    /* color scheme is determined by:
      1. Check if project defaults to "Same as System" (auto)
      2. If above is true and user has not set a project preference, use their OS preference
      3. Else use their project preference
      4. Else use project default (light or dark)
    */
    setColorScheme(colorMode === 'auto' && storedTheme === 'auto' ? userColorScheme : storedTheme || colorMode);
  }, [colorMode, htmlEl, userColorScheme, storedTheme]);

  useEffect(() => {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.attributeName === 'data-color-mode')
          htmlEl
            .querySelector('[data-color-mode]')
            .setAttribute('data-color-mode', mutation.target.attributes['data-color-mode'].value);
      });
    });
    observer.observe(htmlEl, { attributes: true });
    return () => observer.disconnect();
  }, [htmlEl]);

  return colorScheme;
};

module.exports = useColorScheme;
