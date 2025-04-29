import React from 'react';

const TutorialTile = () => {
  const style = {
    height: '50px',
    border: '1px solid var(--color-border-default)',
    borderRadius: 'var(--border-radius-lg)',
    minWidth: '230px',
    display: 'inline-flex',
    padding: '10px',
  };

  const placeholderStyle = {
    borderRadius: 'var(--border-radius-lg)',
    backgroundColor: 'var(--color-skeleton)',
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

export default TutorialTile;
