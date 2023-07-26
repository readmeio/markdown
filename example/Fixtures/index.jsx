import PropTypes from 'prop-types';
import React, { useCallback, useMemo } from 'react';

import syntaxFixtures from './docs';

const Fixtures = ({ lazyImages, mdx, render, safeMode, route, getRoute, setQuery }) => {
  const options = useMemo(() => ({ lazyImages, safeMode, mdx }), [lazyImages, safeMode, mdx]);

  const handleSelect = event => {
    getRoute(event.target.value);
  };
  const onChange = event => {
    getRoute(event.target.value);
  };
  const toggleSafeMode = useCallback(() => {
    setQuery('safe-mode', !safeMode);
  }, [safeMode, setQuery]);
  const toggleLazyImages = useCallback(() => {
    setQuery('lazy-images', !lazyImages);
  }, [lazyImages, setQuery]);

  let fixture = route;
  let name = `${route.slice(0, 20)}...`;

  if (route in syntaxFixtures) {
    ({ doc: fixture, name } = syntaxFixtures[route]);
  }

  const fields = (
    <>
      <fieldset className="rdmd-demo--fieldset">
        <legend>Fixture</legend>
        <select id="fixture-select" onChange={handleSelect} value={route}>
          <option value="" />
          {Object.entries(syntaxFixtures).map(([sym, { name: _name }]) => {
            return (
              <option key={sym} value={sym}>
                {_name}
              </option>
            );
          })}
        </select>
      </fieldset>
      <fieldset className="rdmd-demo--fieldset rdmd-demo--options">
        <legend>Options</legend>
        <div>
          <label htmlFor="safe-mode">Safe Mode</label>
          <input checked={options.safeMode} id="safe-mode" onChange={toggleSafeMode} type="checkbox" />
        </div>
        <div>
          <label htmlFor="lazy-images">Lazy Load Images</label>
          <input checked={options.lazyImages} id="lazy-images" onChange={toggleLazyImages} type="checkbox" />
        </div>
      </fieldset>
    </>
  );

  return render({ children: fields, name, fixture, onChange, options });
};

Fixtures.propTypes = {
  getRoute: PropTypes.func.isRequired,
  render: PropTypes.func.isRequired,
  route: PropTypes.string,
};

export default Fixtures;
