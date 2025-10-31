import React from 'react';

// We render a placeholder in this library, as the actual implemenation is
// deeply tied to the main app
const MCPIntro = () => {
  const style = {
    height: '200px',
    border: '1px solid var(--color-border-default, rgba(black, 0.1))',
    borderRadius: 'var(--border-radius-lg, 7.5px)',
    display: 'flex',
    flexDirection: 'column' as const,
    padding: '20px',
    gap: '15px',
  };

  const placeholderStyle = {
    borderRadius: 'var(--border-radius-md, 5px)',
    backgroundColor: 'var(--color-skeleton, #384248)',
  };

  const headerStyle = {
    ...placeholderStyle,
    height: '24px',
    width: '200px',
  };

  const lineStyle = {
    ...placeholderStyle,
    height: '12px',
    width: '100%',
  };

  return (
    <div className="MCPIntro" style={style}>
      <div style={headerStyle} />
      <div style={{ ...lineStyle, width: '90%' }} />
      <div style={{ ...lineStyle, width: '95%' }} />
      <div style={{ ...lineStyle, width: '85%' }} />
      <div style={{ ...lineStyle, width: '92%' }} />
      <div style={{ ...lineStyle, width: '88%' }} />
    </div>
  );
};

export default MCPIntro;
