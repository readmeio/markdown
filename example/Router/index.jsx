import React, { useEffect, useState } from 'react';

const trimHash = () => window.location.hash.replace(/^#/, '');

const Router = ({ render }) => {
  const [route, getRoute] = useState(trimHash());

  useEffect(() => {
    const handleStateChange = () => {
      getRoute(trimHash());
    };

    history.replaceState({}, '', `#${route}`);
    window.addEventListener('popstate', handleStateChange);

    return () => {
      window.removeEventListener('popstate', handleStateChange);
    };
  });

  return render({ route, getRoute });
};

export default Router;
