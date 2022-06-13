import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';

import syntaxFixtures from './docs';

const Fixtures = ({ render, selected, getRoute }) => {
  const [edited, setEdited] = useState(null);
  const [options, setOptions] = useState({ safeMode: false });

  const handleSelect = event => {
    getRoute(event.target.value);
  };
  const onChange = event => {
    setEdited(event.target.value);
    getRoute('edited');
  };
  const onChangeSafeMode = useCallback(() => {
    setOptions({
      ...options,
      safeMode: !options.safeMode,
    });
  }, [options]);

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
      <fieldset className="rdmd-demo--fieldset rdmd-demo--options">
        <legend>Options</legend>
        <div>
          <label htmlFor="safe-mode">Safe Mode</label>
          <input id="safe-mode" onChange={onChangeSafeMode} type="checkbox" value={options.safeMode} />
        </div>
      </fieldset>
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
