import React from 'react';

const Router = ({ render }) => {
  const [hash, setHash] = React.useState(window.location.hash.replace(/^#/, ''));
  const getRoute = route => {
    setHash(route);
    history.replaceState({}, '', `#${route}`);
  };

  return render({ route: hash, getRoute });
};

export default Router;
