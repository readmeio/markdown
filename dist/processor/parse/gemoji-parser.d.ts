export = parser;
declare function parser(): void;
declare namespace parser {
    export { sanitize };
}
declare function sanitize(sanitizeSchema: any): typeof parser;
