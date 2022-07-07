import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import syntaxFixtures from './docs';

const Fixtures = ({ render, safeMode, selected, getRoute, setQuery }) => {
  const [edited, setEdited] = useState(null);
  const options = useMemo(() => ({ safeMode }), [safeMode]);

  const handleSelect = event => {
    getRoute(event.target.value);
  };
  const onChange = event => {
    setEdited(event.target.value);
    getRoute('edited');
  };
  const toggleSafeMode = useCallback(() => {
    setQuery('safe-mode', !safeMode);
  }, [safeMode, setQuery]);

  let fixture;
  let name;
  if (selected === 'edited') {
    fixture = edited;
    name = '** modified **';
  } else {
    ({ doc: fixture, name } = syntaxFixtures[selected]);
  }

  const fields = (
    <>
      <fieldset className="rdmd-demo--fieldset">
        <legend>Fixture</legend>
        <select id="fixture-select" onChange={handleSelect} value={selected}>
          {edited && <option value={'edited'}>** modified **</option>}
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
      </fieldset>
    </>
  );

  return render({ children: fields, name, fixture, onChange, options });
};

Fixtures.propTypes = {
  getRoute: PropTypes.func.isRequired,
  render: PropTypes.func.isRequired,
  selected: PropTypes.string,
};

export default Fixtures;
