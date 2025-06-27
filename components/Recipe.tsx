import React from 'react';

// We render a placeholder in this library, as the actual implemenation is
// deeply tied to the main app
const Recipe = () => {
  const style = {
    height: '50px',
    border: '1px solid var(--color-border-default, rgba(black, 0.1))',
    borderRadius: 'var(--border-radius-lg, 7.5px)',
    minWidth: '230px',
    display: 'inline-flex',
    padding: '10px',
  };

  const placeholderStyle = {
    borderRadius: 'var(--border-radius-lg, 7.5px)',
    backgroundColor: 'var(--color-skeleton, #384248)',
  };

  const avatarStyle = {
    ...placeholderStyle,
    height: '30px',
    width: '30px',
  };

  const lineStyle = {
    ...placeholderStyle,
    height: '12px',
    width: '150px',
    margin: '0 15px',
  };

  return (
    <div>
      <div style={style}>
        <div style={avatarStyle} />
        <div>
          <div style={{ ...lineStyle, marginBottom: '6px' }} />
          <div style={{ ...lineStyle, width: '75px' }} />
        </div>
      </div>
    </div>
  );
};

export default Recipe;
