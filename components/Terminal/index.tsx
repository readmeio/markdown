import copy from 'copy-to-clipboard';
import React, { useState } from 'react';

import './style.scss';

interface TerminalProps {
  children?: string;
  title?: string;
}

/**
 * Terminal component that displays command-line interface style content.
 */
const Terminal = ({ children = '', title }: TerminalProps) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Normalize children to string
  const content = typeof children === 'string' ? children : String(children);
  const lines = content.trim().split('\n');

  const copyToClipboard = (text: string, index: number) => {
    // Remove the $ prefix and trim
    const command = text.trim().slice(1).trim();

    if (copy(command)) {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    }
  };

  return (
    <div className="rdmd-terminal">
      {/* Terminal header with title and window buttons */}
      <div className="rdmd-terminal-header">
        <div className="rdmd-terminal-buttons">
          <span className="rdmd-terminal-button rdmd-terminal-button_close" />
          <span className="rdmd-terminal-button rdmd-terminal-button_minimize" />
          <span className="rdmd-terminal-button rdmd-terminal-button_maximize" />
        </div>
        {title && <span className="rdmd-terminal-title">{title}</span>}
      </div>

      {/* Terminal content */}
      <div className="rdmd-terminal-content">
        {lines.map((line, index) => {
          const trimmedLine = line.trim();
          const isInput = trimmedLine.startsWith('$');
          const isEmptyLine = trimmedLine === '';
          const displayContent = isInput ? trimmedLine.slice(1).trim() : trimmedLine;
          const isCopied = copiedIndex === index;

          if (isEmptyLine) {
            return <div key={index} className="rdmd-terminal-line rdmd-terminal-line_empty" />;
          }

          return (
            <div
              key={index}
              className={`rdmd-terminal-line ${isInput ? 'rdmd-terminal-line_input' : 'rdmd-terminal-line_output'}`}
            >
              {isInput && <span className="rdmd-terminal-prompt">$</span>}
              <span className={`rdmd-terminal-text ${isInput ? 'rdmd-terminal-text_input' : 'rdmd-terminal-text_output'}`}>
                {displayContent}
              </span>
              {isInput && (
                <button
                  aria-label={isCopied ? 'Copied!' : 'Copy command'}
                  className={`rdmd-terminal-copy ${isCopied ? 'rdmd-terminal-copy_copied' : ''}`}
                  onClick={() => copyToClipboard(trimmedLine, index)}
                  type="button"
                >
                  <i className={`fa-regular fa-${isCopied ? 'check' : 'copy'}`} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Terminal;
