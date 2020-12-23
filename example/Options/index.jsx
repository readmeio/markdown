import React from 'react';
import PropTypes from 'prop-types';
// eslint-disable-next-line import/no-extraneous-dependencies
import { LabeledCheckbox } from '@readme/ui';

const defer = fn => window.requestAnimationFrame(() => window.requestAnimationFrame(fn));

function Option({ param, checked, label, onChange }) {
  const [value, setValue] = React.useState(checked);
  const toggle = () => setValue(!value);

  React.useEffect(() => {
    defer(() => onChange({ [param]: value }));
  }, [value]);

  return <LabeledCheckbox key={param} checked={value} label={label} onChange={toggle} type="toggle" />;
}

Option.propTypes = {
  checked: PropTypes.bool,
  label: PropTypes.string,
  onChange: PropTypes.func,
  param: PropTypes.string,
};

function Options({ params, setParams }) {
  return (
    <fieldset className="rdmd-demo--options">
      <span className="rdmd-demo--label">options</span>
      <div className="rdmd-demo--toggles">
        {['compatabilityMode', 'copyButtons', 'correctnewlines'].map(param => (
          <Option key={param} checked={!!params[param]} label={param} onChange={setParams} param={param} />
        ))}
      </div>
    </fieldset>
  );
}

Options.propTypes = {
  params: PropTypes.obj,
  setParams: PropTypes.func,
};

export default Options;
