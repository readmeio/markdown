import { useEffect, useState } from 'react';

const trimHash = () => window.location.hash.replace(/^#/, '');

const Router = ({ children }) => {
  const [route, getRoute] = useState(trimHash().replace(/^edited$/, ''));

  useEffect(() => {
    const handleStateChange = () => {
      getRoute(trimHash());
    };

    const url = new URL(window.location);
    url.hash = route;

    // eslint-disable-next-line no-restricted-globals
    history.replaceState({}, '', url);
    window.addEventListener('popstate', handleStateChange);

    return () => {
      window.removeEventListener('popstate', handleStateChange);
    };
  });

  return children({ route, getRoute });
};

export default Router;
