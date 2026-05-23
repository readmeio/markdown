import type { CompileOptions } from '@mdx-js/mdx';
export type CompileOpts = CompileOptions & {
    components?: Record<string, string>;
    copyButtons?: boolean;
    hardBreaks?: boolean;
    missingComponents?: 'ignore' | 'throw';
    useTailwind?: boolean;
};
declare const compile: (text: string, { components, missingComponents, copyButtons, useTailwind, hardBreaks, ...opts }?: CompileOpts) => string;
export default compile;
