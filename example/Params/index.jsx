import React from 'react';
import PropTypes from 'prop-types';

const getSearchParams = () =>
  [...new URLSearchParams(document.location.search).entries()].reduce((obj, [k, v]) => {
    obj[k] = v !== 'false';
    return obj;
  }, {});

const Params = ({ children }) => {
  const [params, _setParams] = React.useState(getSearchParams());

  const setParams = newParams => {
    const merged = { ...params, ...newParams };

    Object.keys(merged)
      .filter(param => !merged[param])
      .forEach(param => delete merged[param]);

    _setParams(merged);
  };

  React.useEffect(() => {
    const url = new URL(document.location);
    url.search = new URLSearchParams(params).toString();

    // eslint-disable-next-line no-restricted-globals
    history.replaceState({}, '', url);
  });

  return children({ params, setParams });
};

Params.propTypes = {
  children: PropTypes.func,
};

export default Params;
