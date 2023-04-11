export = AnchorWithContext;
declare function AnchorWithContext(props: any): JSX.Element;
declare namespace AnchorWithContext {
    export function sanitize(sanitizeSchema: any): any;
    export { getHref };
}
declare function getHref(href: any, baseUrl: any): any;
