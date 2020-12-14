import React, { useState } from 'react';
import ReactDOM from 'react-dom';

import syntaxFixtures from './Syntax';

const initialFixture = Object.keys(syntaxFixtures)[0];

const Fixtures = ({ render }) => {
  const [selected, setSelected] = useState(initialFixture);
  const [edited, setEdited] = useState(null);

  const handleSelect = event => {
    setSelected(event.target.value);
  };
  const onChange = event => {
    setEdited(event.target.value);
    setSelected('edited');
  };

  let fixture;
  let name;
  if (selected === 'edited') {
    fixture = edited;
    name = '** modified **';
  } else {
    ({ doc: fixture, name } = syntaxFixtures[selected]);
  }

  const select = (
    <fieldset className="rdmd-demo--fixture-select">
      <label className="rdmd-demo--label" htmlFor="fixture-select">
        fixture
      </label>
      <select className="rdmd-demo--select" id="fixture-select" onChange={handleSelect} value={selected}>
        {edited && <option value={'edited'}>** modified **</option>}
        {Object.entries(syntaxFixtures).map(([sym, { name }]) => {
          return (
            <option key={sym} value={sym}>
              {name}
            </option>
          );
        })}
      </select>
    </fieldset>
  );

  return render({ select, name, fixture, onChange });
};

export default Fixtures;
