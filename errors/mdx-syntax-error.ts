import type { VFileMessage } from 'vfile-message';

export default class MdxSyntaxError extends SyntaxError {
  original: VFileMessage = null;

  constructor(error: VFileMessage, doc: string) {
    const { message, line, column, url } = error;

    const messages = [
      `Oh no! We ran into a syntax error at { line: ${line}, column: ${column} }, please see this url for more details: ${url}`,
    ];

    if (typeof line !== 'undefined') {
      messages.push(doc.split('\n')[line - 1]);

      if (typeof column !== 'undefined') {
        const prefix = ' '.repeat(Math.max(column - 1, 0));
        messages.push(`${prefix}↑ ${message}`);
      }
    }

    super(messages.join('\n'));

    this.original = error;
    this.name = 'MdxSyntaxError';
  }
}
