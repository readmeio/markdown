export = parser;
declare function parser(): void;
declare namespace parser {
    export { sanitize, imgSizeByWidth };
}
declare function sanitize(sanitizeSchema: any): typeof parser;
declare const imgSizeByWidth: Map<any, any>;
