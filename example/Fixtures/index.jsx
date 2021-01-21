import React, { useState } from 'react';
import PropTypes from 'prop-types';

import syntaxFixtures from './docs';

const Fixtures = ({ render, selected, getRoute }) => {
  const [edited, setEdited] = useState(null);

  const handleSelect = event => {
    getRoute(event.target.value);
  };
  const onChange = event => {
    setEdited(event.target.value);
    getRoute('edited');
  };

  let fixture;
  let name;
  if (selected === 'edited') {
    fixture = edited;
    name = '** modified **';
  } else {
    ({ doc: fixture, name } = syntaxFixtures[selected]);
  }

  const fields = (
    <fieldset className="rdmd-demo--fixture-select">
      <label className="rdmd-demo--label" htmlFor="fixture-select">
        fixture
      </label>
      <select className="rdmd-demo--select" id="fixture-select" onChange={handleSelect} value={selected}>
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
  );

  return render({ children: fields, name, fixture, onChange });
};

Fixtures.propTypes = {
  getRoute: PropTypes.func.isRequired,
  render: PropTypes.func.isRequired,
  selected: PropTypes.string,
};

export default Fixtures;
