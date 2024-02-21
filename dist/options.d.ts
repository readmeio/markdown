export namespace options {
    const alwaysThrow: boolean;
    const compatibilityMode: boolean;
    const copyButtons: boolean;
    const correctnewlines: boolean;
    namespace markdownOptions {
        const fences: boolean;
        const commonmark: boolean;
        const gfm: boolean;
        const ruleSpaces: boolean;
        const listItemIndent: string;
        const spacedTable: boolean;
        const paddedTable: boolean;
    }
    const lazyImages: boolean;
    const normalize: boolean;
    const safeMode: boolean;
    namespace settings {
        const position: boolean;
    }
    const theme: string;
}
export function parseOptions(userOpts?: {}): {
    alwaysThrow: boolean;
    compatibilityMode: boolean;
    copyButtons: boolean;
    correctnewlines: boolean;
    markdownOptions: {
        fences: boolean;
        commonmark: boolean;
        gfm: boolean;
        ruleSpaces: boolean;
        listItemIndent: string;
        spacedTable: boolean;
        paddedTable: boolean;
    };
    lazyImages: boolean;
    normalize: boolean;
    safeMode: boolean;
    settings: {
        position: boolean;
    };
    theme: string;
};
