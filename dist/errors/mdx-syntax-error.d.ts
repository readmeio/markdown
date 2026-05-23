import type { VFileMessage } from 'vfile-message';
export default class MdxSyntaxError extends SyntaxError {
    original: VFileMessage;
    constructor(error: VFileMessage, doc: string);
}
