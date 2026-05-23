import type { GlossaryTerm } from '../../../contexts/GlossaryTerms';
import type { CustomComponents, IndexableElements, RMDXModule, TocList, Variables } from '../../../types';
import React from 'react';
export interface RenderOpts {
    baseUrl?: string;
    components?: CustomComponents;
    copyButtons?: boolean;
    imports?: Record<string, unknown>;
    terms?: GlossaryTerm[];
    theme?: 'dark' | 'light';
    useTailwind?: boolean;
    variables?: Variables;
}
/** Flatten CustomComponents into a component map for rehype-react */
export declare function exportComponentsForRehype(components: CustomComponents): Record<string, React.ComponentType>;
/** Create a rehype-react processor */
export declare function createRehypeReactProcessor(components: Record<string, React.ComponentType>): import("unified").Processor<undefined, undefined, undefined, undefined, undefined>;
/** Create a TOC React component from headings */
export declare function createTocComponent(tocHast: TocList): React.FC;
/** Create the default wrapper component with contexts */
export declare function createDefaultComponent(content: React.ReactNode, opts: Pick<RenderOpts, 'baseUrl' | 'copyButtons' | 'terms' | 'theme' | 'variables'>): React.FC;
/** Build the RMDXModule result object */
export declare function buildRMDXModule(content: React.ReactNode, headings: IndexableElements[], tocHast: TocList | null, opts: Pick<RenderOpts, 'baseUrl' | 'copyButtons' | 'terms' | 'theme' | 'variables'>): RMDXModule;
