export interface GlossaryTerm {
    _id?: string;
    definition: string;
    term: string;
}
declare const GlossaryContext: import("react").Context<GlossaryTerm[]>;
export default GlossaryContext;
