import type { GlossaryTerm } from '../contexts/GlossaryTerms';
import type { CustomComponents, RMDXModule } from '../types';
import type { Variables } from '../utils/user';
import type { RunOptions } from '@mdx-js/mdx';
export type RunOpts = Omit<RunOptions, 'Fragment'> & {
    baseUrl?: string;
    components?: CustomComponents;
    copyButtons?: boolean;
    imports?: Record<string, unknown>;
    terms?: GlossaryTerm[];
    theme?: 'dark' | 'light';
    variables?: Variables;
};
declare const run: (string: string, _opts?: RunOpts) => RMDXModule;
export default run;
