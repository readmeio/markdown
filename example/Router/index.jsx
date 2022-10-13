import { useCallback, useEffect, useState } from 'react';

const trimHash = () => window.location.hash.replace(/^#/, '');
const coerceValue = value => {
  switch (value) {
    case 'true':
      return true;
    case 'false':
      return false;
    default:
      return value;
  }
};
const iteratorToObj = iterator => {
  const obj = {};

  // eslint-disable-next-line no-restricted-syntax
  for (const [key, value] of iterator) {
    obj[key] = coerceValue(value);
  }

  return obj;
};

const Router = ({ render }) => {
  const [route, getRoute] = useState(trimHash());
  const [params, setParams] = useState(() => ({
    'lazy-images': true,
    ...iteratorToObj(new URLSearchParams(window.location.search)),
  }));

  const setQuery = useCallback(
    (...args) => {
      const search = new URLSearchParams(params);
      search.set(...args);

      setParams(iteratorToObj(search.entries()));
    },
    [params]
  );

  useEffect(() => {
    const handleStateChange = () => {
      getRoute(trimHash());
    };

    const url = new URL(window.location.href);
    url.search = new URLSearchParams(params).toString();
    url.hash = route;

    window.history.replaceState({}, '', url);
    window.addEventListener('popstate', handleStateChange);

    return () => {
      window.removeEventListener('popstate', handleStateChange);
    };
  });

  return render({ route, getRoute, params, setQuery });
};

export default Router;
