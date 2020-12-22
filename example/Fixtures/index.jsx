import React, { useState } from 'react';
import PropTypes from 'prop-types';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Select } from '@readme/ui';

import syntaxFixtures from './Syntax';

const Fixtures = ({ children, selected, getRoute }) => {
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

  const options = Object.entries(syntaxFixtures).map(([value, { name: label }]) => ({ label, value }));

  if (edited) {
    options.unshift({ label: '** modified **', value: 'edited' });
  }

  const fields = (
    <fieldset className="rdmd-demo--options">
      <label className="rdmd-demo--label" htmlFor="fixture-select">
        fixture
      </label>
      <Select
        className="rdmd-demo--select"
        id="fixture-select"
        onChange={handleSelect}
        options={options}
        value={selected}
      />
    </fieldset>
  );

  return children({ children: fields, name, fixture, onChange });
};

Fixtures.propTypes = {
  children: PropTypes.func.isRequired,
  getRoute: PropTypes.func.isRequired,
  selected: PropTypes.string,
};

export default Fixtures;
